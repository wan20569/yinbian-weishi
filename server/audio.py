"""音频预处理：解码 → 单声道 → 重采样 16k → STFT → mel → 对数 → 标准化 → 切窗。

所有参数都来自 checkpoint 里的 config，不要手改：

    sr=16000, n_mels=128, n_fft=1024, hop=320   # hop=320 → 20ms → 50 帧/秒
    chunk_sec=10.0, hop_sec=5.0                 # 10s×50=500 帧，滑窗 5s=250 帧
    mean=1.5082, std=1.6573                     # 频谱标准化

mel_filters 也保存在 checkpoint 里（形状 (128, 513)），所以不需要 librosa
自己生成滤波器组 —— 这也是本文件不依赖 librosa / numba 的原因。
"""

from __future__ import annotations

import os
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


def _load_with_av(path: str, sr: int) -> np.ndarray:
    """用 PyAV（自带 FFmpeg）解码，覆盖 soundfile 读不了的 AAC / m4a / mp4。

    很多「.mp3」文件其实是 MP4 容器（文件头是 ftypisom），libsndfile 会直接报
    LibsndfileError。这一层用 FFmpeg 解码后交给它的 AudioResampler 直接重采样到
    目标采样率并降混单声道，省掉自己写重采样。
    """
    import av  # 局部导入：没装也不影响 wav/mp3 的正常路径

    with av.open(path) as container:
        if not container.streams.audio:
            raise ValueError(f"文件里没有音频流：{path}")
        stream = container.streams.audio[0]
        resampler = av.AudioResampler(format="flt", layout="mono", rate=sr)

        parts: list[np.ndarray] = []
        for frame in container.decode(stream):
            for out in resampler.resample(frame):
                parts.append(out.to_ndarray().reshape(-1))
        for out in resampler.resample(None):  # 冲刷缓冲区尾包
            parts.append(out.to_ndarray().reshape(-1))

    if not parts:
        raise ValueError(f"解码后没有采样点：{path}")
    return np.ascontiguousarray(np.concatenate(parts), dtype=np.float32)


def _needs_av(path: str) -> bool:
    """按文件头判断是否 MP4 系容器（含 m4a/aac），这类 libsndfile 解不了。"""
    if os.path.splitext(path)[1].lower() in {".m4a", ".aac", ".mp4", ".m4b", ".mov"}:
        return True
    try:
        with open(path, "rb") as fh:
            head = fh.read(12)
    except OSError:
        return False
    return len(head) >= 8 and head[4:8] == b"ftyp"  # ISO BMFF：mp4 / m4a / mov


def load_audio(path: str, sr: int = 16000) -> np.ndarray:
    """读任意常见格式（wav/flac/mp3/ogg/m4a/aac/mp4），返回单声道 float32。"""
    if _needs_av(path):
        return _load_with_av(path, sr)

    try:
        y, orig_sr = sf.read(path, dtype="float32", always_2d=True)
    except Exception:
        return _load_with_av(path, sr)  # 少见封装回退到 FFmpeg

    y = y.mean(axis=1)  # 立体声降混单声道（与训练时 librosa mono=True 一致）
    if orig_sr != sr:
        g = gcd(int(sr), int(orig_sr))
        y = resample_poly(y, sr // g, orig_sr // g).astype(np.float32)
    return np.ascontiguousarray(y, dtype=np.float32)


def stft_power(y: np.ndarray, n_fft: int = 1024, hop: int = 320) -> np.ndarray:
    """周期 Hann + center pad，返回功率谱 (1+n_fft/2, T)。

    按 2048 帧分块计算：整首 4 分钟歌有 1.2 万帧，一次性构建索引矩阵会吃掉上百 MB，
    分块后峰值内存降到十几 MB，结果完全相同。
    """
    window = np.hanning(n_fft + 1)[:-1].astype(np.float32)  # 周期 Hann，与 librosa 一致
    y = np.pad(y, n_fft // 2, mode="constant")
    if len(y) < n_fft:
        y = np.pad(y, (0, n_fft - len(y)))
    n_frames = 1 + (len(y) - n_fft) // hop

    block = 2048
    parts: list[np.ndarray] = []
    for start in range(0, n_frames, block):
        stop = min(start + block, n_frames)
        idx = np.arange(n_fft)[None, :] + hop * np.arange(start, stop)[:, None]
        spec = np.fft.rfft(y[idx] * window, n=n_fft, axis=1)
        parts.append((np.abs(spec) ** 2).T.astype(np.float32))
    return np.concatenate(parts, axis=1)


def mel_spectrogram(y: np.ndarray, mel_filters: np.ndarray, n_fft: int, hop: int) -> np.ndarray:
    """mel 功率谱 (n_mels, T)。mel_filters 形状为 (n_mels, 1+n_fft/2)。"""
    return (mel_filters.astype(np.float32) @ stft_power(y, n_fft, hop)).astype(np.float32)


def to_logmel(power: np.ndarray, mode: str = "log1p", eps: float = 1e-8) -> np.ndarray:
    """把 mel 功率谱压到对数域。

    checkpoint 只留了 mean=1.5082 / std=1.6573，没留变换函数名，这一层需要反推。

    判据（用第一层 Conv 输出与 BN 训练统计量的偏差衡量，偏差越小越接近训练分布）：

        mode      标准化后均值   |Δmean|   var 比值
        log1p        -0.83       0.32      0.21     ← 最接近
        ln           -7.55       3.09     12.22
        db          -31.15      12.68    267.94
        dbmax       -50.38      20.76    306.02

    dB 系列可排除（训练集均值不可能是 1.5），因此默认 log1p；
    若你在自己的歌曲上发现判定反常，用 `--compare` 一次跑完四种做对照。
    """
    if mode == "log1p":
        return np.log1p(power)
    if mode == "ln":
        return np.log(np.maximum(power, eps))
    if mode == "db":  # 10*log10(power)，ref=1
        return 10.0 * np.log10(np.maximum(power, 1e-10))
    if mode == "dbmax":  # librosa.power_to_db 风格，相对全局最大值
        db = 10.0 * np.log10(np.maximum(power, 1e-10))
        return db - db.max()
    raise ValueError(f"未知 mel-mode: {mode}")


def normalize(x: np.ndarray, mean: float, std: float) -> np.ndarray:
    return ((x - mean) / max(std, 1e-6)).astype(np.float32)


def split_chunks(mel: np.ndarray, n_frames: int = 500, hop_frames: int = 250) -> np.ndarray:
    """按 10 秒（500 帧）/ 步长 5 秒（250 帧）切窗，返回 (N, 1, n_mels, n_frames)。

    帧数换算：n_frames = chunk_sec * sr / hop = 10 * 16000 / 320 = 500。
    默认值对应 checkpoint 的 chunk_sec / hop_sec，调用方也可从 config 现算传入。
    不足一窗的补零。
    """
    n_mels, total = mel.shape
    if total <= n_frames:
        pad = np.zeros((n_mels, n_frames), dtype=np.float32)
        pad[:, :total] = mel
        return pad[None, None, :, :]

    starts = list(range(0, total - n_frames + 1, hop_frames))
    if starts[-1] + n_frames < total:  # 补上结尾残余部分
        starts.append(total - n_frames)
    chunks = np.stack([mel[:, s : s + n_frames] for s in starts])
    return chunks[:, None, :, :].astype(np.float32)
