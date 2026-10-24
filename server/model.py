"""AI 音乐检测模型（按 ai_music_cnn.pt 的 state_dict 反推重建）。

checkpoint 是纯权重（非 TorchScript），没有保存 forward 定义，因此结构由
参数 shape 反推，并用 load_state_dict(strict=True) 验证：32 个键全命中，
零缺失、零多余，说明层数与顺序与训练时一致。

    [B, 1, 128, 500]   mel 图（128 频带 × 500 帧 = 10 秒 @50 帧/秒）
      Conv(1→32)   + BN + ReLU + MaxPool
      Conv(32→64)  + BN + ReLU + MaxPool
      Conv(64→128) + BN + ReLU + MaxPool
      Conv(128→128)+ BN + ReLU + MaxPool
      AdaptiveAvgPool2d(1)
      Flatten → Linear(128→128) → ReLU → Dropout → Linear(128→1)

输出是单个 logit（BCEWithLogits 训练），sigmoid 之后才是 AI 概率。
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

N_MELS = 128
N_FRAMES = 500  # 10 秒 × 50 帧/秒（chunk_sec=10, sr=16000, hop=320）


class AIAudioDetector(nn.Module):
    def __init__(self, n_mels: int = N_MELS) -> None:
        super().__init__()

        def block(cin: int, cout: int) -> nn.Sequential:
            return nn.Sequential(
                nn.Conv2d(cin, cout, kernel_size=3, padding=1),
                nn.BatchNorm2d(cout),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
            )

        self.features = nn.Sequential(
            block(1, 32),
            block(32, 64),
            block(64, 128),
            block(128, 128),
        )
        # head 的 index 0/2/3 无参数：Flatten / ReLU / Dropout
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = F.adaptive_avg_pool2d(x, 1)
        return self.head(x)  # [B, 1] logits


def load_model(ckpt_path: str, device: str = "cpu") -> tuple[AIAudioDetector, dict]:
    """返回 (eval 模式模型, checkpoint 里的 config)。"""
    # weights_only=False：checkpoint 里含 numpy 数组（mel_filters）和 dict，
    # 无法用安全的 weights_only 模式反序列化。只加载你自己产出的权重文件。
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model = AIAudioDetector(n_mels=int(ckpt["config"].get("n_mels", N_MELS)))
    model.load_state_dict(ckpt["state_dict"], strict=True)
    model.to(device).eval()
    return model, ckpt["config"]
