"""风险分级阈值（单一来源，CLI 与 HTTP 两个入口共用）。

经 602 首测试集实测确定，禁止调整：
  三档 + 人工复核灰区 acc 0.9867；均值单阈值 0.60 acc 0.9801；单阈值 0.70 acc 0.9701。
"""

RISK_HIGH = 70.0
RISK_MEDIUM = 40.0


def risk_of(probability: float) -> str:
    """把 AI 概率（0-100）映射为三态 riskLevel：high / medium / low。"""
    if probability >= RISK_HIGH:
        return "high"
    if probability >= RISK_MEDIUM:
        return "medium"
    return "low"
