/**
 * 把模型返回值整理成页面要用的 DetectionResult。
 *
 * 唯一原则：**不编数据**。
 *   · aiProbability 以模型为准，不做任何修饰。
 *   · 后端给了 similarity → 用真实值；没给 → 记 0，并把「未测量」这个事实
 *     通过 similarityAvailable 一路传到 UI（卡片显示「未进行声纹比对」），
 *     而不是找一个好看的数字填上。
 *   · matchedSegments 同理：后端给空就是空。
 *   · 结论、风险等级、证据链文案全部由「真实算出的数值 + 是否测量」推导，
 *     没测的项目就明说没测。
 *
 * 当「完全没有模型结果」（请求失败 / 没有原始音频）时，这里**绝不回填种子随机**：
 * 失败 / 无音频由 use-detection-simulation 的 source 标记（failed / noFile），
 * UI 层据此渲染「检测失败」错误态，绝不用随机数冒充检测结论。
 */

import { SCENARIOS, type RandomResult } from "./random-result";
import type { DetectionResult, EvidenceItem, RiskLevel } from "./types";
import type { InferencePayload } from "./inference-client";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function riskOf(aiProbability: number, similarity: number): RiskLevel {
  const peak = Math.max(aiProbability, similarity);
  if (peak >= 70) return "high";
  if (peak >= 40) return "medium";
  return "low";
}

/**
 * 结论文案。
 * @param similarityMeasured false 表示后端没做声纹比对，此时结论只能谈 AI 生成
 */
function verdictFor(aiProbability: number, similarity: number, similarityMeasured: boolean): string {
  if (!similarityMeasured) {
    if (aiProbability >= 70) {
      return (
        `模型判定为高度疑似 AI 生成（${aiProbability.toFixed(1)}%）。` +
        "本次仅完成 AI 生成鉴别，未进行声纹比对，抄袭相似度不参与判定。"
      );
    }
    if (aiProbability >= 40) {
      return (
        `模型检出一定 AI 生成特征（${aiProbability.toFixed(1)}%），处于判定的中间区间，建议结合人工复核；` +
        "本次未进行声纹比对。"
      );
    }
    return (
      `模型未检出显著 AI 生成特征（${aiProbability.toFixed(1)}%）。` +
      "本次仅完成 AI 生成鉴别，未进行声纹比对。"
    );
  }

  if (aiProbability >= 70) {
    return similarity >= 70 ? SCENARIOS.ai_copy.verdict : SCENARIOS.ai_original.verdict;
  }
  if (aiProbability <= 30) {
    return similarity >= 70 ? SCENARIOS.human_copy.verdict : SCENARIOS.human_original.verdict;
  }
  return (
    `检出一定程度的 AI 生成特征（${aiProbability.toFixed(1)}%），` +
    "处于判定的中间区间，建议结合人工复核后给出最终结论。"
  );
}

function cnnConclusion(aiProbability: number): string {
  if (aiProbability >= 70) return "判定为 AI 生成，置信度高";
  if (aiProbability >= 40) return "检出 AI 生成特征，置信度中等";
  return "判定为真人演唱/演奏";
}

/**
 * 重写证据链：属于模型的写真实分数，不属于模型的明说没测。
 */
function buildEvidence(
  chain: EvidenceItem[],
  aiProbability: number,
  similarity: number,
  hitCount: number,
  similarityMeasured: boolean
): EvidenceItem[] {
  return chain.map((item) => {
    if (item.key === "cnn") {
      return {
        ...item,
        score: round1(aiProbability),
        conclusion: cnnConclusion(aiProbability),
      };
    }

    if (item.key === "fingerprint") {
      if (!similarityMeasured) {
        return { ...item, score: 0, status: "pending", conclusion: "本次未进行声纹比对" };
      }
      return {
        ...item,
        score: round1(similarity),
        conclusion:
          hitCount > 0
            ? `命中 ${hitCount} 处相似片段，最高 ${similarity.toFixed(1)}%`
            : "指纹库无显著命中",
      };
    }

    // melody（旋律特征）：当前模型不提供，别假装算过
    if (!similarityMeasured) {
      return { ...item, score: 0, status: "pending", conclusion: "本次未进行旋律特征提取" };
    }
    return item;
  });
}

export function mergeInferenceResult(
  base: DetectionResult,
  live: InferencePayload | null,
  _scenario: RandomResult | null
): DetectionResult {
  // ── 没有模型结果：请求失败或没有原始音频。
  // 这里**不再回填种子随机数值**——随机数冒充检测结论是严重误导。
  // 失败 / 无音频由 use-detection-simulation 的 source 标记（failed / noFile），
  // UI 层据此渲染「检测失败」错误态，而不是展示 base 里那套随机底。
  // 因此这里只原样返回 base，绝不把 scenario 的假数值灌进去。
  if (!live) {
    return base;
  }

  // ── 有模型结果：只信模型给的字段
  const aiProbability = clamp(round1(live.aiProbability), 0, 100);
  const similarityMeasured = live.similarityAvailable !== false;
  const similarity = similarityMeasured ? clamp(round1(live.similarity), 0, 100) : 0;
  const matchedSegments = live.matchedSegments ?? [];

  return {
    ...base,
    aiProbability,
    similarity,
    matchedSegments,
    // 时长也用后端解析出来的真实值，不再沿用上传页写死的占位时长
    audioDuration: live.duration && live.duration > 0 ? live.duration : base.audioDuration,
    // 风险等级：优先采用后端权威的 riskLevel，后端未给才用本地阈值兜底
    riskLevel: live.riskLevel ?? riskOf(aiProbability, similarity),
    verdict: verdictFor(aiProbability, similarity, similarityMeasured),
    // 真实推理才有的字段，逐窗概率 / 峰值 / 窗口数 / 断裂点 / 模型名原样透传
    windowProbabilities: live.windowProbabilities,
    aiProbabilityPeak: live.aiProbabilityPeak,
    windows: live.windows,
    breakpoints: live.breakpoints,
    model: live.model,
    strongWindowCount: live.strongWindowCount,
    evidenceChain: buildEvidence(
      base.evidenceChain,
      aiProbability,
      similarity,
      matchedSegments.length,
      similarityMeasured
    ),
  };
}
