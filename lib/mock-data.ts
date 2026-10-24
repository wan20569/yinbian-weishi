import { SCENARIOS, generateRandomResult, hashSeed } from "./random-result";
import type { DetectionResult, DetectTypeOption, Task } from "./types";

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

import { MOCK_NOW } from "./utils";

const MINUTE = 60 * 1000;
const ago = (minutes: number) => new Date(MOCK_NOW - minutes * MINUTE).toISOString();

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

/** 任务列表（6 条，覆盖全部状态） */
export const mockTasks: Task[] = [
  {
    id: "tsk_20260930_001",
    fileName: "夜色频率_remix_final.wav",
    fileSize: 42_380_000,
    duration: 204,
    createdAt: ago(24),
    status: "done",
    detectType: "comprehensive",
    progress: 100,
    result: buildScenarioResult({
      taskId: "tsk_20260930_001",
      fileName: "夜色频率_remix_final.wav",
      duration: 204,
      detectType: "comprehensive",
      createdAt: ago(24),
    }),
  },
  {
    id: "tsk_20260930_002",
    fileName: "demo_vocal_take3.mp3",
    fileSize: 6_840_000,
    duration: 187,
    createdAt: ago(96),
    status: "analyzing",
    detectType: "ai",
    progress: 58,
  },
  {
    id: "tsk_20260930_003",
    fileName: "广告配乐_待审核.flac",
    fileSize: 28_120_000,
    duration: 231,
    createdAt: ago(142),
    status: "queued",
    detectType: "plagiarism",
    progress: 0,
  },
  {
    id: "tsk_20260929_004",
    fileName: "参赛作品_07_海边的信.mp3",
    fileSize: 7_960_000,
    duration: 198,
    createdAt: ago(180),
    status: "done",
    detectType: "comprehensive",
    progress: 100,
    result: buildScenarioResult({
      taskId: "tsk_20260929_004",
      fileName: "参赛作品_07_海边的信.mp3",
      duration: 198,
      detectType: "comprehensive",
      createdAt: ago(180),
    }),
  },
  {
    id: "tsk_20260928_005",
    fileName: "专辑母带_01_晨雾.wav",
    fileSize: 51_040_000,
    duration: 231,
    createdAt: ago(1420),
    status: "done",
    detectType: "comprehensive",
    progress: 100,
    result: buildScenarioResult({
      taskId: "tsk_20260928_005",
      fileName: "专辑母带_01_晨雾.wav",
      duration: 231,
      detectType: "comprehensive",
      createdAt: ago(1420),
    }),
  },
  {
    id: "tsk_20260927_006",
    fileName: "直播切片_音频损坏.mp3",
    fileSize: 1_240_000,
    duration: 0,
    createdAt: ago(1580),
    status: "failed",
    detectType: "ai",
    progress: 32,
  },
];

/** 历史任务补充（用于「最近检测」等视图） */
export const mockRecentTasks: Task[] = [
  {
    id: "tsk_20260926_007",
    fileName: "翻唱demo_潮汐之间.mp3",
    fileSize: 8_320_000,
    duration: 176,
    createdAt: ago(2680),
    status: "done",
    detectType: "comprehensive",
    progress: 100,
    result: buildScenarioResult({
      taskId: "tsk_20260926_007",
      fileName: "翻唱demo_潮汐之间.mp3",
      duration: 176,
      detectType: "comprehensive",
      createdAt: ago(2680),
    }),
  },
  {
    id: "tsk_20260925_008",
    fileName: "独立发行_晨雾B面.wav",
    fileSize: 46_720_000,
    duration: 198,
    createdAt: ago(4300),
    status: "done",
    detectType: "comprehensive",
    progress: 100,
    result: buildScenarioResult({
      taskId: "tsk_20260925_008",
      fileName: "独立发行_晨雾B面.wav",
      duration: 198,
      detectType: "comprehensive",
      createdAt: ago(4300),
    }),
  },
];

export const allMockTasks: Task[] = [...mockTasks, ...mockRecentTasks];

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