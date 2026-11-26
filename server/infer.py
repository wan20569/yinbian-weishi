"""命令行推理入口。

用法（在项目根目录 D:/AI音乐 下）：

    D:\\yinbian-venv\\Scripts\\python.exe server\\infer.py "D:\\some\\song.mp3"
    D:\\yinbian-venv\\Scripts\\python.exe server\\infer.py "D:\\some\\folder" --self-check
    D:\\yinbian-venv\\Scripts\\python.exe server\\infer.py "a.mp3" "b.mp3" "D:\\music"

在 PyCharm 里也可以直接右键 Run，参数据填要检测的文件或目录路径。
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from audio import load_audio, mel_spectrogram, normalize, split_chunks, to_logmel  # noqa: E402
from model import load_model  # noqa: E402
from risk import risk_of  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_LOCAL_CKPT = os.path.join(_HERE, "weights", "ai_music_cnn.pt")
_FALLBACK_CKPT = r"C:\Users\WW\xwechat_files\wxid_u5p1v2njmt2o22_5c16\msg\file\2026-10\ai_music_cnn.pt"

# 优先用项目内副本（微信缓存目录可能被清理）；可用环境变量 AI_MUSIC_CKPT 覆盖
DEFAULT_CKPT = os.environ.get("AI_MUSIC_CKPT") or (
    _LOCAL_CKPT if os.path.exists(_LOCAL_CKPT) else _FALLBACK_CKPT
)

AUDIO_EXT = {".wav", ".mp3", ".flac", ".ogg", ".aiff", ".aif", ".m4a", ".aac"}


def predict_file(path: str, model, cfg: dict, mel_filters: np.ndarray, mel_mode: str = "log1p") -> dict:
    """对单个音频文件推理，返回整体与逐窗概率。"""
    sr = int(cfg["sr"])
    y = load_audio(path, sr)
    duration = len(y) / sr

    power = mel_spectrogram(y, mel_filters, int(cfg["n_fft"]), int(cfg["hop"]))
    logmel = to_logmel(power, mel_mode)
    logmel = normalize(logmel, float(cfg["mean"]), float(cfg["std"]))

    chunk_frames = int(round(float(cfg["chunk_sec"]) * sr / int(cfg["hop"])))
    hop_frames = int(round(float(cfg["hop_sec"]) * sr / int(cfg["hop"])))
    chunks = split_chunks(logmel, chunk_frames, hop_frames)

    with torch.no_grad():
        logits = model(torch.from_numpy(chunks)).squeeze(1)
        probs = torch.sigmoid(logits).cpu().numpy()

    window_probs = [round(float(p) * 100, 1) for p in probs]

    # 强证据窗口计数：P(AI) 严格大于 0.60 的窗口个数。
    # 必须用未舍入的原始 probs（sigmoid 之后的 numpy 数组）计算，不能用 window_probs：
    # 后者已 round(...,1)，原始 0.5996 与 0.6004 都会变成 60.0，计数会与真值对不上。
    # 只返回计数，占比由前端用 count / segments 现算，避免冗余浮点。
    strong_window_count = int((probs > 0.60).sum())

    return {
        "path": path,
        "duration": round(duration, 2),
        "chunks": int(chunks.shape[0]),
        "ai_probability": round(float(probs.mean()) * 100, 1),
        "ai_probability_max": round(float(probs.max()) * 100, 1),
        "strong_window_count": strong_window_count,
        "window_probs": window_probs,
        "breakpoints": _detect_breakpoints(window_probs, float(cfg["chunk_sec"]), float(cfg["hop_sec"])),
        "mel_mean": round(float(logmel.mean()), 3),
        "mel_std": round(float(logmel.std()), 3),
    }


def _detect_breakpoints(
    window_probs: list[float],
    chunk_sec: float,
    hop_sec: float,
) -> list[dict]:
    """检测相邻窗口间确信判决的跳变（风格断裂点）。

    只报告「两侧都确信」的跳变：
      * jump = |P[i+1] - P[i]| >= 50（百分点）
      * 且一侧 > 70、另一侧 < 30（渐变不算断裂）
    断裂区间取两窗的重叠段 [start_{i+1}, start_i + chunk_sec]。
    按 jump 降序最多报告 2 个；不满足返回空数组。

    本函数只做展示性定位，不参与 ai_probability 的判决（判决只用均值）。
    """
    if len(window_probs) < 2:
        return []

    found: list[dict] = []
    for i in range(len(window_probs) - 1):
        a = window_probs[i]
        b = window_probs[i + 1]
        jump = abs(b - a)
        if jump < 50:
            continue
        # 两侧都必须是确信判决
        high_side = a > 70 or b > 70
        low_side = a < 30 or b < 30
        if not (high_side and low_side):
            continue

        direction = "ai_to_human" if a > b else "human_to_ai"
        # 窗 i 占 [i*hop, i*hop + chunk]，窗 i+1 占 [(i+1)*hop, (i+1)*hop + chunk]
        # 两者重叠段 = [(i+1)*hop, i*hop + chunk]
        start = (i + 1) * hop_sec
        end = i * hop_sec + chunk_sec
        found.append(
            {
                "start": round(start, 1),
                "end": round(end, 1),
                "jump": round(jump, 2),
                "direction": direction,
            }
        )

    found.sort(key=lambda x: -x["jump"])
    return found[:2]


def iter_files(targets: list[str]) -> list[str]:
    """把文件 / 目录混合的入参展开成去重后的音频文件列表。"""
    hits: list[str] = []
    for target in targets:
        if os.path.isfile(target):
            hits.append(target)
        elif os.path.isdir(target):
            for root, _dirs, names in os.walk(target):
                for name in names:
                    if os.path.splitext(name)[1].lower() in AUDIO_EXT:
                        hits.append(os.path.join(root, name))
        else:
            print(f"跳过（路径不存在）：{target}")
    # dict.fromkeys 保序去重，避免同一个文件被重复推理
    return list(dict.fromkeys(sorted(hits)))


def main() -> None:
    parser = argparse.ArgumentParser(description="AI 音乐检测（本地推理）")
    parser.add_argument("target", nargs="+", help="音频文件或目录，可一次传多个")
    parser.add_argument("--ckpt", default=DEFAULT_CKPT, help="模型权重路径")
    parser.add_argument("--mel-mode", default="log1p", choices=["log1p", "ln", "db", "dbmax"])
    parser.add_argument("--self-check", action="store_true", help="打印标准化后的 mel 分布，用于核对预处理")
    parser.add_argument("--compare", action="store_true", help="对同一文件跑四种 mel 变换，用于核对预处理是否选对")
    args = parser.parse_args()

    if not os.path.exists(args.ckpt):
        raise SystemExit(f"找不到模型文件：{args.ckpt}")

    files = iter_files(args.target)
    if not files:
        raise SystemExit(f"没有可处理的音频：{args.target}")
    ckpt = torch.load(args.ckpt, map_location="cpu", weights_only=False)
    mel_filters = ckpt["mel_filters"]
    model, cfg = load_model(args.ckpt)

    print(f"模型：{os.path.basename(args.ckpt)}  |  {sum(p.numel() for p in model.parameters()):,} 参数")
    print(f"预处理：sr={cfg['sr']}  n_mels={cfg['n_mels']}  n_fft={cfg['n_fft']}  hop={cfg['hop']}")
    print(f"窗口：{cfg['chunk_sec']}s / 步长 {cfg['hop_sec']}s   mel-mode={args.mel_mode}")
    print("-" * 78)
    if args.compare:
        print(f"{'文件':<32} {'log1p':>8} {'ln':>8} {'db':>8} {'dbmax':>8}   ← 同一首歌在四种预处理下的 AI 概率")
    else:
        print(f"{'文件':<34}{'时长':>7}{'窗数':>5}{'AI概率':>9}{'峰值':>8}  判定")
    print("-" * 78)

    for path in files:
        if args.compare:
            parts = []
            for m in ["log1p", "ln", "db", "dbmax"]:
                try:
                    rr = predict_file(path, model, cfg, mel_filters, m)
                    parts.append(f"{rr['ai_probability']:>7.1f}%")
                except Exception as exc:
                    parts.append(f"{m}=ERR({type(exc).__name__})")
            print(f"{os.path.basename(path)[:30]:<32} " + "  ".join(parts))
            continue

        t0 = time.perf_counter()
        try:
            r = predict_file(path, model, cfg, mel_filters, args.mel_mode)
        except Exception as exc:  # 单个文件失败不影响整批
            print(f"{os.path.basename(path)[:32]:<34}  失败：{type(exc).__name__}: {exc}")
            continue
        cost = (time.perf_counter() - t0) * 1000
        level = risk_of(r["ai_probability"])
        label = {"high": "AI 生成", "medium": "存疑 · 需人工复核", "low": "真人创作"}[level]
        print(
            f"{os.path.basename(path)[:32]:<34}{r['duration']:>6.1f}s{r['chunks']:>5}"
            f"{r['ai_probability']:>8.1f}%{r['ai_probability_max']:>7.1f}%  {label}  ({cost:.0f}ms)"
        )
        if args.self_check:
            print(f"    └ 标准化后 mel: mean={r['mel_mean']} std={r['mel_std']}  (目标 mean≈0 std≈1)")
            print(f"    └ 逐窗概率: {r['window_probs']}")


if __name__ == "__main__":
    try:  # Windows 控制台默认 GBK，强制 UTF-8 避免中文乱码
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
