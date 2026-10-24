"""FastAPI 推理服务：把 ai_music_cnn.pt 暴露成 HTTP 接口。

启动（在项目根目录 D:/AI音乐 下）：

    .venv-infer\\Scripts\\python.exe -m uvicorn server.serve:app --host 127.0.0.1 --port 8000
    # 或者直接跑本文件（等价，带热重载开关）
    .venv-infer\\Scripts\\python.exe server\\serve.py

接口：
    POST /api/detect   上传音频，返回 {aiProbability, similarity, matchedSegments, ...}
    GET  /api/health   健康检查（模型是否就绪）
    GET  /docs         FastAPI 自动生成的调试页面

注意：
  * 模型只在启动时加载一次，因此必须单 worker（uvicorn 默认就是 1 个 worker）。
  * 推理是 CPU 密集的同步任务，所以路由函数用 def 而非 async def，
    Starlette 会自动丢到线程池执行，避免阻塞事件循环。
  * 本模型只输出「AI 生成概率」，不产出抄袭相似度与匹配片段。
    similarity 固定返回 0.0，matchedSegments 返回空数组，
    并用 similarityAvailable=false 明确告诉调用方「这一项没有真实数据」，
    前端可据此保留自己的演示值，避免把 0 当成「确实不相似」。
"""

from __future__ import annotations

import logging
import os
import re
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from infer import DEFAULT_CKPT, predict_file  # noqa: E402
from model import load_model  # noqa: E402

# ---------------- 配置 ----------------
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "50"))
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
MEL_MODE = os.environ.get("MEL_MODE", "log1p")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

ALLOWED_EXT = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".mp4", ".aiff", ".aif"}

# 风险分级阈值（与前端 RiskLevel 对齐）
RISK_HIGH = 70.0
RISK_MEDIUM = 40.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("detect")

# 启动时填充，全程只读
STATE: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not os.path.exists(DEFAULT_CKPT):
        raise RuntimeError(f"找不到模型权重：{DEFAULT_CKPT}")

    started = time.perf_counter()
    model, cfg = load_model(DEFAULT_CKPT)
    ckpt = torch.load(DEFAULT_CKPT, map_location="cpu", weights_only=False)

    STATE["model"] = model
    STATE["cfg"] = cfg
    STATE["mel_filters"] = ckpt["mel_filters"]
    STATE["model_name"] = Path(DEFAULT_CKPT).name
    STATE["params"] = sum(p.numel() for p in model.parameters())

    # 单文件推理是毫秒级，线程数给太多反而抢 GIL；4 个足够
    torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))

    log.info(
        "模型就绪：%s（%s 参数，%.0fms）| 预处理 mel-mode=%s | 端口 %s",
        STATE["model_name"],
        f"{STATE['params']:,}",
        (time.perf_counter() - started) * 1000,
        MEL_MODE,
        PORT,
    )
    try:
        yield
    finally:
        STATE.clear()


app = FastAPI(
    title="音辩卫士 · AI 音乐检测服务",
    description="上传音频返回 AI 生成概率。模型：轻量 CNN（Mel 频谱输入，二分类）。",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,  # 用不到 Cookie，关掉可以避免与通配源的冲突
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)


# ---------------- 数据模型 ----------------
class MatchedSegment(BaseModel):
    id: str
    start: float
    end: float
    similarity: float
    sourceTitle: str
    sourceArtist: str
    source: str
    matchedAt: str | None = None


class DetectResponse(BaseModel):
    aiProbability: float = Field(..., description="AI 生成概率 0-100")
    similarity: float = Field(..., description="抄袭相似度 0-100（本模型不产出，固定 0）")
    matchedSegments: list[MatchedSegment] = Field(default_factory=list)

    similarityAvailable: bool = Field(
        False, description="false 表示 similarity / matchedSegments 无真实数据，前端应自行处理"
    )
    riskLevel: str = Field(..., description="low / medium / high")
    aiProbabilityPeak: float = Field(..., description="逐窗概率峰值 0-100")

    duration: float = Field(..., description="音频时长（秒）")
    segments: int = Field(..., description="参与推理的窗口数")
    windowProbabilities: list[float] = Field(default_factory=list)

    fileName: str | None = None
    model: str = ""
    elapsedMs: float = 0.0


class HealthResponse(BaseModel):
    status: str
    model: str
    params: int
    melMode: str
    maxUploadMB: int
    corsOrigins: list[str]


def risk_of(probability: float) -> str:
    if probability >= RISK_HIGH:
        return "high"
    if probability >= RISK_MEDIUM:
        return "medium"
    return "low"


def save_upload(file: UploadFile) -> tuple[str, int]:
    """边读边写临时文件并计数，避免超大文件把内存吃掉。返回 (路径, 字节数)。"""
    original = Path(file.filename or "audio.bin")
    suffix = original.suffix.lower() or ".bin"
    if suffix not in ALLOWED_EXT:
        # 不直接拒绝：很多文件后缀是错的（比如 mp3 里装的是 AAC），交给解码层判断
        log.warning("非常见后缀 %s，仍尝试解码：%s", suffix, original.name)

    limit = MAX_UPLOAD_MB * 1024 * 1024
    written = 0
    path = ""

    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix, prefix="detect_"
        ) as tmp:
            path = tmp.name
            while chunk := file.file.read(1024 * 1024):
                written += len(chunk)
                if written > limit:
                    raise HTTPException(
                        status_code=413,
                        detail=f"文件超过 {MAX_UPLOAD_MB}MB 上限",
                    )
                tmp.write(chunk)
    except HTTPException:
        if path and os.path.exists(path):
            os.unlink(path)
        raise
    except Exception as exc:  # 磁盘写失败等
        if path and os.path.exists(path):
            os.unlink(path)
        raise HTTPException(status_code=500, detail=f"保存上传文件失败：{exc}") from exc

    if written == 0:
        if os.path.exists(path):
            os.unlink(path)
        raise HTTPException(status_code=400, detail="上传内容为空")

    return path, written


@app.post("/api/detect", response_model=DetectResponse, summary="上传音频并检测")
def detect(file: UploadFile = File(..., description="音频文件：mp3/wav/flac/m4a/ogg")):
    if "model" not in STATE:
        raise HTTPException(status_code=503, detail="模型尚未就绪，请稍后重试")

    started = time.perf_counter()
    path, size = save_upload(file)

    try:
        result = predict_file(
            path,
            STATE["model"],
            STATE["cfg"],
            STATE["mel_filters"],
            MEL_MODE,
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("推理失败：%s", file.filename)
        # 错误信息里的临时路径对调用方没有意义，换回原始文件名。
        # 注意：异常字符串里的反斜杠可能被转义，所以不去匹配整条路径，
        # 而是把任何带盘符的引号路径统一替换掉。
        message = str(exc).splitlines()[0]
        message = re.sub(r"'[A-Za-z]:[^']*'", f"'{file.filename or '上传文件'}'", message)
        raise HTTPException(
            status_code=422,
            detail=f"音频解码或推理失败（{type(exc).__name__}）：{message}",
        ) from exc
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    elapsed = (time.perf_counter() - started) * 1000
    probability = float(result["ai_probability"])

    log.info(
        "%-34s %5.1fs %2d窗  AI=%5.1f%%  %4.0fms",
        (file.filename or "-")[:34],
        result["duration"],
        result["chunks"],
        probability,
        elapsed,
    )

    return DetectResponse(
        aiProbability=round(probability, 1),
        # 本模型是二分类 BCE，不输出抄袭相似度。这里给 0 并用 similarityAvailable 标注，
        # 而不是编造一个数字——避免前端把假数据当成真实检测结果。
        similarity=0.0,
        matchedSegments=[],
        similarityAvailable=False,
        riskLevel=risk_of(probability),
        aiProbabilityPeak=float(result["ai_probability_max"]),
        duration=result["duration"],
        segments=int(result["chunks"]),
        windowProbabilities=[float(x) for x in result["window_probs"]],
        fileName=file.filename,
        model=STATE.get("model_name", ""),
        elapsedMs=round(elapsed, 1),
    )


@app.get("/api/health", response_model=HealthResponse, summary="健康检查")
def health():
    ready = "model" in STATE
    return HealthResponse(
        status="ok" if ready else "loading",
        model=STATE.get("model_name", ""),
        params=int(STATE.get("params", 0)),
        melMode=MEL_MODE,
        maxUploadMB=MAX_UPLOAD_MB,
        corsOrigins=CORS_ORIGINS,
    )


if __name__ == "__main__":
    try:  # Windows 控制台默认 GBK，避免中文日志乱码
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
