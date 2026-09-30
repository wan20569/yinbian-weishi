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

const resultHigh: DetectionResult = {
  aiProbability: 98.7,
  similarity: 87.3,
  riskLevel: "high",
  verdict: "该音频具有高度 AI 生成特征，且检出 2 处与已知作品高度相似的片段，建议下架核查后再发行。",
  waveformData: generateWaveform(20260930),
  audioDuration: 204,
  reportNo: "YBS-2026-0930-0042",
  createdAt: ago(24),
  evidenceChain: [
    {
      key: "cnn",
      name: "轻量 CNN 鉴别模型",
      method: "梅尔频谱 + 卷积判别",
      conclusion: "判定为 AI 生成，置信度高",
      status: "success",
      score: 98.7,
    },
    {
      key: "fingerprint",
      name: "音频指纹比对",
      method: "指纹检索 + 片段对齐",
      conclusion: "命中 1 处指纹，相似度 87.3%",
      status: "success",
      score: 87.3,
    },
    {
      key: "melody",
      name: "旋律编曲特征提取",
      method: "旋律线 / 和弦 / 编曲特征",
      conclusion: "动机与和声进行高度重合",
      status: "success",
      score: 74.6,
    },
  ],
  matchedSegments: [
    {
      id: "seg-1",
      start: 32,
      end: 45,
      similarity: 87.3,
      sourceTitle: "夜色频率 (Night Frequency)",
      sourceArtist: "陈屿 · 2024 独立发行",
      source: "fingerprint",
      matchedAt: ago(24),
    },
    {
      id: "seg-2",
      start: 112,
      end: 121,
      similarity: 64.1,
      sourceTitle: "潮汐之间",
      sourceArtist: "蓝岸乐队 · 2023 专辑《回声》",
      source: "melody",
      matchedAt: ago(24),
    },
  ],
};

const resultMedium: DetectionResult = {
  aiProbability: 63.4,
  similarity: 41.2,
  riskLevel: "medium",
  verdict: "存在部分 AI 辅助创作痕迹，未检出高相似度片段，建议人工复核后使用。",
  waveformData: generateWaveform(20260821),
  audioDuration: 187,
  reportNo: "YBS-2026-0929-0031",
  createdAt: ago(180),
  evidenceChain: [
    {
      key: "cnn",
      name: "轻量 CNN 鉴别模型",
      method: "梅尔频谱 + 卷积判别",
      conclusion: "倾向 AI 辅助生成，需复核",
      status: "success",
      score: 63.4,
    },
    {
      key: "fingerprint",
      name: "音频指纹比对",
      method: "指纹检索 + 片段对齐",
      conclusion: "无显著指纹命中",
      status: "success",
      score: 18.5,
    },
    {
      key: "melody",
      name: "旋律编曲特征提取",
      method: "旋律线 / 和弦 / 编曲特征",
      conclusion: "存在常见和声进行重合",
      status: "success",
      score: 41.2,
    },
  ],
  matchedSegments: [
    {
      id: "seg-3",
      start: 68,
      end: 77,
      similarity: 41.2,
      sourceTitle: "和声进行库 · IV-V-iii-vi",
      sourceArtist: "通用和声模式",
      source: "melody",
      matchedAt: ago(180),
    },
  ],
};

const resultLow: DetectionResult = {
  aiProbability: 12.4,
  similarity: 8.6,
  riskLevel: "low",
  verdict: "未发现 AI 生成特征，指纹库与旋律库均无显著命中，可正常发行。",
  waveformData: generateWaveform(20260714),
  audioDuration: 231,
  reportNo: "YBS-2026-0928-0026",
  createdAt: ago(1420),
  evidenceChain: [
    {
      key: "cnn",
      name: "轻量 CNN 鉴别模型",
      method: "梅尔频谱 + 卷积判别",
      conclusion: "判定为真人演唱/演奏",
      status: "success",
      score: 12.4,
    },
    {
      key: "fingerprint",
      name: "音频指纹比对",
      method: "指纹检索 + 片段对齐",
      conclusion: "无指纹命中",
      status: "success",
      score: 6.2,
    },
    {
      key: "melody",
      name: "旋律编曲特征提取",
      method: "旋律线 / 和弦 / 编曲特征",
      conclusion: "旋律走向独立",
      status: "success",
      score: 8.6,
    },
  ],
  matchedSegments: [],
};

const resultClean2: DetectionResult = {
  aiProbability: 6.8,
  similarity: 15.3,
  riskLevel: "low",
  verdict: "原创性良好，仅检出通用鼓组素材重合，不影响作品独创性认定。",
  waveformData: generateWaveform(20260603),
  audioDuration: 198,
  reportNo: "YBS-2026-0927-0018",
  createdAt: ago(2680),
  evidenceChain: [
    {
      key: "cnn",
      name: "轻量 CNN 鉴别模型",
      method: "梅尔频谱 + 卷积判别",
      conclusion: "判定为真人演唱/演奏",
      status: "success",
      score: 6.8,
    },
    {
      key: "fingerprint",
      name: "音频指纹比对",
      method: "指纹检索 + 片段对齐",
      conclusion: "仅命中通用鼓组素材",
      status: "success",
      score: 15.3,
    },
    {
      key: "melody",
      name: "旋律编曲特征提取",
      method: "旋律线 / 和弦 / 编曲特征",
      conclusion: "旋律走向独立",
      status: "success",
      score: 9.1,
    },
  ],
  matchedSegments: [
    {
      id: "seg-4",
      start: 8,
      end: 14,
      similarity: 15.3,
      sourceTitle: "通用鼓组采样包 · Basic Kit 04",
      sourceArtist: "公有素材库",
      source: "fingerprint",
      matchedAt: ago(2680),
    },
  ],
};

const resultMid2: DetectionResult = {
  aiProbability: 79.2,
  similarity: 55.7,
  riskLevel: "medium",
  verdict: "AI 生成体征明显，检出 1 处中等相似度片段，建议在商用前取得授权或替换该段落。",
  waveformData: generateWaveform(20260522),
  audioDuration: 176,
  reportNo: "YBS-2026-0926-0009",
  createdAt: ago(4300),
  evidenceChain: [
    {
      key: "cnn",
      name: "轻量 CNN 鉴别模型",
      method: "梅尔频谱 + 卷积判别",
      conclusion: "判定为 AI 生成",
      status: "success",
      score: 79.2,
    },
    {
      key: "fingerprint",
      name: "音频指纹比对",
      method: "指纹检索 + 片段对齐",
      conclusion: "命中 1 处中等相似度片段",
      status: "success",
      score: 55.7,
    },
    {
      key: "melody",
      name: "旋律编曲特征提取",
      method: "旋律线 / 和弦 / 编曲特征",
      conclusion: "副歌动机部分重合",
      status: "success",
      score: 49.8,
    },
  ],
  matchedSegments: [
    {
      id: "seg-5",
      start: 54,
      end: 63,
      similarity: 55.7,
      sourceTitle: "雾港 (Foggy Harbour)",
      sourceArtist: "周迟 · 2022 EP《潮间》",
      source: "melody",
      matchedAt: ago(4300),
    },
  ],
};

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
    result: resultHigh,
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
    result: resultMedium,
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
    result: resultLow,
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
    result: resultMid2,
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
    result: resultClean2,
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
export function buildFreshResult(fileName: string, detectType: string): DetectionResult {
  const isPlagiarism = detectType === "plagiarism";
  const aiProbability = isPlagiarism ? 34.6 : 97.4;
  const similarity = isPlagiarism ? 91.2 : 82.5;
  const duration = 213;
  const seed = fileName.length * 7919 + 104729;
  const stamp = String((seed % 9000) + 1000);

  return {
    aiProbability,
    similarity,
    riskLevel: Math.max(aiProbability, similarity) >= 85 ? "high" : "medium",
    verdict: isPlagiarism
      ? "检出 2 处与已知作品高度相似的片段，其中一处相似度超过 90%，建议在商用前取得授权。"
      : "该音频具有高度 AI 生成特征，副歌段落存在疑似洗稿片段，建议下架核查后再发行。",
    waveformData: generateWaveform(seed),
    audioDuration: duration,

    reportNo: `YBS-2026-0930-${stamp}`,
    createdAt: new Date(MOCK_NOW).toISOString(),
    evidenceChain: [
      {
        key: "cnn",
        name: "轻量 CNN 鉴别模型",
        method: "梅尔频谱 + 卷积判别",
        conclusion: isPlagiarism ? "存在轻度 AI 处理痕迹" : "判定为 AI 生成，置信度高",
        status: "success",
        score: aiProbability,
      },
      {
        key: "fingerprint",
        name: "音频指纹比对",
        method: "指纹检索 + 片段对齐",
        conclusion: isPlagiarism ? "命中 1 处高相似度指纹" : "命中 1 处指纹，相似度 82.5%",
        status: "success",
        score: similarity,
      },
      {
        key: "melody",
        name: "旋律编曲特征提取",
        method: "旋律线 / 和弦 / 编曲特征",
        conclusion: "副歌动机与和声进行重合",
        status: "success",
        score: isPlagiarism ? 68.4 : 71.9,
      },
    ],
    matchedSegments: [
      {
        id: "fresh-seg-1",
        start: 32,
        end: 45,
        similarity,
        sourceTitle: "夜色频率 (Night Frequency)",
        sourceArtist: "陈屿 · 2024 独立发行",
        source: "fingerprint",
        matchedAt: new Date(MOCK_NOW).toISOString(),
      },
      {
        id: "fresh-seg-2",
        start: 141,
        end: 152,
        similarity: isPlagiarism ? 73.8 : 58.2,
        sourceTitle: "潮汐之间",
        sourceArtist: "蓝岸乐队 · 2023 专辑《回声》",
        source: "melody",
        matchedAt: new Date(MOCK_NOW).toISOString(),
      },
    ],
  };
}
