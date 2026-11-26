import { SCENARIOS, generateRandomResult, hashSeed } from "./random-result";
import { MOCK_NOW } from "./utils";
import type { DetectionResult, DetectTypeOption, Task } from "./types";

/**
 * 说明：本文件原本还导出了 mockTasks / mockRecentTasks / allMockTasks 三份
 * 「演示任务」种子数据（夜色频率、参赛作品等 8 条），用于在没有真实检测时
 * 撑起工作台与检测中心的界面。这些演示任务已整体移除：
 *   · 工作台与检测中心现在只展示本次会话里真实上传产生的任务；
 *   · 没有任务时由 EmptyState 展示空态引导，不再出现假数据。
 * 仍然保留的是「检测结果生成器」与检测类型字典——它们是真实上传流程
 * 计算结论时用到的能力，不是展示数据。
 */

/**
 * 确定性伪随机：保证服务端 / 客户端渲染出的波形一致，避免 hydration mismatch
 */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 生成 mock 波形峰值数据 */
export function generateWaveform(seed: number, bars = 168): number[] {
  const rand = seededRandom(seed);
  const raw: number[] = [];
  let envelope = 0.3;
  for (let i = 0; i < bars; i += 1) {
    // 用多个正弦叠加出「有乐句起伏」的观感，再加噪声
    const phrase =
      Math.sin((i / bars) * Math.PI * 6) * 0.28 +
      Math.sin((i / bars) * Math.PI * 17) * 0.12 +
      Math.sin((i / bars) * Math.PI * 33) * 0.06;
    envelope += (rand() - 0.5) * 0.22;
    envelope = Math.min(1, Math.max(0.12, envelope));
    const value = Math.min(1, Math.max(0.06, 0.42 + phrase * envelope + (rand() - 0.5) * 0.24));
    raw.push(Number(value.toFixed(3)));
  }
  return raw;
}

/** 检测类型选项 */
export const detectTypeOptions: DetectTypeOption[] = [
  {
    value: "ai",
    title: "AI 鉴别",
    description: "轻量 CNN 判别模型，识别是否为 AI 生成音频",
    icon: "sparkles",
    tag: "声学特征",
  },
  {
    value: "plagiarism",
    title: "抄袭检测",
    description: "音频指纹比对 + 旋律特征提取，定位相似片段",
    icon: "copy",
    tag: "片段定位",
  },
  {
    value: "comprehensive",
    title: "综合检测",
    description: "AI 鉴别与抄袭检测全链路，输出标准化报告",
    icon: "shield",
    tag: "推荐",
  },
];

export const detectTypeLabel: Record<string, string> = {
  ai: "AI 鉴别",
  plagiarism: "抄袭检测",
  comprehensive: "综合检测",
};

/**
 * 按「场景化随机」组装一份完整检测结论。
 * AI 概率 / 相似度 / 匹配片段全部由 taskId 的种子推导，
 * 因此任务列表页、详情页、报告三处永远一致。
 */
export function buildScenarioResult(input: {
  taskId: string;
  fileName: string;
  duration: number;
  detectType: Task["detectType"];
  createdAt?: string;
}): DetectionResult {
  const { taskId, fileName, duration, detectType, createdAt } = input;
  const seed = hashSeed(taskId);
  const random = generateRandomResult(taskId, duration);
  const scenario = SCENARIOS[random.scenario];

  const hitCount = random.matchedSegments.length;
  const hasAi = random.scenario === "ai_original" || random.scenario === "ai_copy";
  const melodyHit = random.matchedSegments.some((item) => item.source === "melody");
  const melodyScore = Number(
    Math.max(
      8,
      random.matchedSegments[1]?.similarity ??
        (random.matchedSegments[0] ? random.matchedSegments[0].similarity * 0.82 : random.similarity * 0.6 + 5)
    ).toFixed(1)
  );

  return {
    aiProbability: random.aiProbability,
    similarity: random.similarity,
    riskLevel: random.riskLevel,
    verdict: scenario.verdict,
    waveformData: generateWaveform(seed),
    audioDuration: duration,
    reportNo: `YBS-2026-0930-${String((seed % 9000) + 1000)}`,
    createdAt: createdAt ?? new Date(MOCK_NOW).toISOString(),
    matchedSegments: random.matchedSegments,
    evidenceChain: [
      {
        key: "cnn",
        name: "轻量 CNN 鉴别模型",
        method: "梅尔频谱 + 卷积判别",
        conclusion: hasAi ? "判定为 AI 生成，置信度高" : "判定为真人演唱/演奏",
        status: "success",
        score: random.aiProbability,
      },
      {
        key: "fingerprint",
        name: "音频指纹比对",
        method: "指纹检索 + 片段对齐",
        conclusion:
          hitCount === 0
            ? "指纹库无显著命中"
            : `命中 ${hitCount} 处相似片段，最高 ${random.similarity.toFixed(1)}%`,
        status: "success",
        score: random.similarity,
      },
      {
        key: "melody",
        name: "旋律编曲特征提取",
        method: "旋律线 / 和弦 / 编曲特征",
        conclusion: melodyHit
          ? "动机与和声进行重合"
          : random.scenario === "human_original"
            ? "旋律走向独立"
            : "未见显著旋律重合",
        status: "success",
        score: melodyScore,
      },
    ],
  };
}

/** 个人账户 mock */
export const mockAccount = {
  name: "独立音乐人 · 林声",
  email: "linsheng@studio.cn",
  plan: "专业版",
  quotaTotal: 500,
  quotaUsed: 414,
  avatarText: "LS",
  joinedAt: "2026-04-18",
};

/**
 * 新上传任务的默认检测结果模板。
 * 保证「新建检测 -> 结果页」流程永远有数据可展示。
 */
export function buildFreshResult(input: {
  taskId: string;
  fileName: string;
  detectType: string;
  duration?: number;
}): DetectionResult {
  return buildScenarioResult({
    taskId: input.taskId,
    fileName: input.fileName,
    duration: input.duration ?? 213,
    detectType: input.detectType as Task["detectType"],
  });
}
