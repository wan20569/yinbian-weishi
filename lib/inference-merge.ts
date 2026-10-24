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
 * 只有「完全没有模型结果」（请求失败 / 没有原始音频）时，才回落到种子随机，
 * 那时 UI 会挂上「已降级随机 / 随机结果」徽章，读者不会被误导。
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
  if (peak >= 35) return "medium";
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
  scenario: RandomResult | null
): DetectionResult {
  // ── 没有模型结果：请求失败或没有原始音频，整体回落到种子随机
  // 此时页面会显示「已降级随机 / 随机结果」徽章，数值只用于演示流程
  if (!live) {
    if (!scenario) return base;
    return {
      ...base,
      aiProbability: scenario.aiProbability,
      similarity: scenario.similarity,
      matchedSegments: scenario.matchedSegments,
      riskLevel: scenario.riskLevel,
      // 兜底分支不能沿用「指纹库无显著命中」这类结论 —— 那些检测根本没跑
      verdict:
        "当前为随机结果：模型未参与判定，也未进行声纹比对。" +
        "此页仅供界面预览，请重新上传音频以获取真实检测结论。",
      evidenceChain: buildEvidence(
        base.evidenceChain,
        scenario.aiProbability,
        scenario.similarity,
        scenario.matchedSegments.length,
        false
      ),
    };
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
    riskLevel: riskOf(aiProbability, similarity),
    verdict: verdictFor(aiProbability, similarity, similarityMeasured),
    evidenceChain: buildEvidence(
      base.evidenceChain,
      aiProbability,
      similarity,
      matchedSegments.length,
      similarityMeasured
    ),
  };
}
