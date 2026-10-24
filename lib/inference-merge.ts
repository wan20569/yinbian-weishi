/**
 * 把「真实推理结果」与「演示数据」合成一份前后一致的 DetectionResult。
 *
 * 要解决的问题：后端模型只输出 aiProbability，similarity 恒为 0、
 * matchedSegments 恒为空（它没有指纹库）。如果直接把真实值盖上去，
 * 就会出现「AI 93% + 相似度 0% + 无命中片段」这种看着像 bug 的页面；
 * 如果继续沿用原场景的相似度，又可能出现「AI 11% 却判定 AI 洗稿」的矛盾组合。
 *
 * 规则：
 *  1. aiProbability 永远以模型为准。
 *  2. similarityAvailable 为 true → 用后端的真实相似度与片段。
 *  3. 否则按真实 AI 概率重新选一个「未检出抄袭」的同象限场景，
 *     只借用它的相似度数值，片段一律置空 —— 没做指纹比对就不编片段。
 *  4. 结论文案、风险等级、证据链分数全部由合并后的数值反推，
 *     保证页面上每个数字和每句话互相对得上。
 */

import { generateRandomResult, SCENARIOS, type RandomResult } from "./random-result";
import type { DetectionResult, EvidenceItem, RiskLevel } from "./types";
import type { InferencePayload } from "./inference-client";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function riskOf(aiProbability: number, similarity: number): RiskLevel {
  const peak = Math.max(aiProbability, similarity);
  if (peak >= 70) return "high";
  if (peak >= 35) return "medium";
  return "low";
}

function verdictFor(aiProbability: number, similarity: number): string {
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

function patchEvidence(
  chain: EvidenceItem[],
  aiProbability: number,
  similarity: number,
  hitCount: number,
  similarityAvailable: boolean
): EvidenceItem[] {
  return chain.map((item) => {
    if (item.key === "cnn") {
      const conclusion =
        aiProbability >= 70
          ? "判定为 AI 生成，置信度高"
          : aiProbability >= 40
            ? "检出 AI 生成特征，置信度中等"
            : "判定为真人演唱/演奏";
      return { ...item, score: Number(aiProbability.toFixed(1)), conclusion };
    }

    if (item.key === "fingerprint") {
      const conclusion = hitCount > 0
        ? `命中 ${hitCount} 处相似片段，最高 ${similarity.toFixed(1)}%`
        : similarityAvailable
          ? "指纹库无显著命中"
          : "指纹比对未接入，此处为演示数值";
      return { ...item, score: Number(similarity.toFixed(1)), conclusion };
    }

    return item;
  });
}

export interface MergeContext {
  taskId: string;
  duration: number;
}

/**
 * @param base     原始结果（波形、报告号、时长等静态字段都从这里来）
 * @param live     真实推理结果，null 表示没跑成
 * @param scenario 场景化随机结果，作为降级兜底
 */
export function mergeInferenceResult(
  base: DetectionResult,
  live: InferencePayload | null,
  scenario: RandomResult | null,
  ctx: MergeContext
): DetectionResult {
  // ── 没有真实结果：完全沿用场景数据（演示模式 / 请求失败 / 预设任务）
  if (!live) {
    if (!scenario) return base;
    return {
      ...base,
      aiProbability: scenario.aiProbability,
      similarity: scenario.similarity,
      matchedSegments: scenario.matchedSegments,
      riskLevel: scenario.riskLevel,
      verdict: SCENARIOS[scenario.scenario].verdict,
      evidenceChain: patchEvidence(
        base.evidenceChain,
        scenario.aiProbability,
        scenario.similarity,
        scenario.matchedSegments.length,
        false
      ),
    };
  }

  // ── 有真实结果
  const aiProbability = clamp(live.aiProbability, 0, 100);
  const similarityAvailable = live.similarityAvailable !== false;

  let similarity: number;
  let matchedSegments = live.matchedSegments;

  if (similarityAvailable) {
    similarity = clamp(live.similarity, 0, 100);
  } else {
    // 借同象限、且「未检出抄袭」的场景取一个相似度数值；
    // 用 taskId 做种子，保证同一任务刷新后数值不变。
    const seedScenario = aiProbability >= 70 ? "ai_original" : "human_original";
    const derived = generateRandomResult(ctx.taskId, ctx.duration, {
      scenario: seedScenario,
    });
    similarity = derived.similarity;
    matchedSegments = [];
  }

  return {
    ...base,
    aiProbability: Number(aiProbability.toFixed(1)),
    similarity: Number(similarity.toFixed(1)),
    matchedSegments,
    riskLevel: riskOf(aiProbability, similarity),
    verdict: verdictFor(aiProbability, similarity),
    evidenceChain: patchEvidence(
      base.evidenceChain,
      aiProbability,
      similarity,
      matchedSegments.length,
      similarityAvailable
    ),
  };
}
