import type { MatchedSegment, RiskLevel } from "./types";

/**
 * ─────────────────────────────────────────────────────────────
 *  场景化随机结果生成
 * ─────────────────────────────────────────────────────────────
 *  背景：AI 生成概率与抄袭相似度本来是两个独立抽取的值，
 *  会出现「AI 98.7% + 相似度 2.1%」这类评委看不懂的组合。
 *  现在改成：先按 taskId 种子选定一个业务场景，再在该场景限定的
 *  区间内取值 —— 数字组合始终自洽。
 *
 *  - 同一 taskId：结果稳定（刷新、列表页、详情页三处一致）
 *  - 不同 taskId：落到不同象限
 *  - 不传 taskId：回落到 Math.random，方便本地调试
 */

export type ScenarioId = "human_original" | "ai_original" | "human_copy" | "ai_copy";

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  verdict: string;
  /** AI 生成概率区间 */
  ai: [number, number];
  /** 整体抄袭相似度区间 */
  similarity: [number, number];
  /** 允许的匹配片段条数区间 */
  segments: [number, number];
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  human_original: {
    id: "human_original",
    label: "真人演唱 · 原创",
    verdict:
      "未检出显著 AI 生成特征，指纹库与旋律库均无显著命中，可按原创作品正常发行。",
    ai: [4, 26],
    similarity: [2, 24],
    segments: [0, 0],
  },
  ai_original: {
    id: "ai_original",
    label: "AI 生成 · 未检出抄袭",
    verdict:
      "该音频具有高度 AI 生成特征，但未命中曲库相似片段，建议在平台侧标注 AI 属性后发行。",
    ai: [74, 97.5],
    similarity: [3, 26],
    segments: [0, 0],
  },
  human_copy: {
    id: "human_copy",
    label: "真人演唱 · 涉嫌抄袭",
    verdict:
      "声源判定为真人生唱，但检出与已知作品高度重合的片段，建议商用前完成授权核查。",
    ai: [5, 27],
    similarity: [74, 94],
    segments: [1, 2],
  },
  ai_copy: {
    id: "ai_copy",
    label: "AI 生成 · 洗稿拼接",
    verdict:
      "该音频具有高度 AI 生成特征，且检出多处与已知作品相似的片段，建议下架核查后再发行。",
    ai: [76, 98.5],
    similarity: [74, 95],
    segments: [2, 2],
  },
};

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[];

/**
 * 场景钉死表：给指定 taskId 指定场景，保证演示时能稳定看到想要的象限。
 * 只钉旗舰任务，其余保持纯随机。
 */
export const SCENARIO_PIN: Record<string, ScenarioId> = {
  tsk_20260930_001: "ai_copy",
  tsk_20260930_002: "human_original",
};

// ─────────────────────────── 种子随机 ───────────────────────────

/** FNV-1a：字符串 -> 32 位整数种子 */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32：小而稳的伪随机序列 */
function createRandom(seed: number) {
  let s = seed || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // 预热：形如 tsk_2026xxxx 的 id 只差末几位，首个输出高度相关，
  // 丢弃前几个输出后场景分布才均匀。
  next();
  next();
  next();
  return next;
}

function resolveRandom(taskId?: string) {
  return taskId ? createRandom(hashSeed(taskId)) : Math.random;
}

// ─────────────────────────── 来源曲池 ───────────────────────────

const SOURCES: Array<Omit<MatchedSegment, "id" | "start" | "end" | "similarity">> = [
  {
    sourceTitle: "夜色频率 (Night Frequency)",
    sourceArtist: "陈屿 · 2024 独立发行",
    source: "fingerprint",
  },
  {
    sourceTitle: "潮汐之间",
    sourceArtist: "蓝岸乐队 · 2023 专辑《回声》",
    source: "melody",
  },
  {
    sourceTitle: "Morning Mist (sketch)",
    sourceArtist: "K. Aoki · 2022 EP《Haze》",
    source: "melody",
  },
  {
    sourceTitle: "城市褶皱",
    sourceArtist: "夜航西飞 · 2024 单曲",
    source: "fingerprint",
  },
  {
    sourceTitle: "December Loop",
    sourceArtist: "M. Larsen · 2021 专辑《North》",
    source: "melody",
  },
];

// ─────────────────────────── 生成入口 ───────────────────────────

export interface RandomResult {
  scenario: ScenarioId;
  aiProbability: number;
  similarity: number;
  matchedSegments: MatchedSegment[];
  riskLevel: RiskLevel;
}

/** 按种子挑一个场景 */
export function pickScenario(taskId?: string): ScenarioId {
  const pinned = taskId ? SCENARIO_PIN[taskId] : undefined;
  if (pinned) return pinned;
  const rand = resolveRandom(taskId);
  return SCENARIO_IDS[Math.floor(rand() * SCENARIO_IDS.length)];
}

function riskOf(aiProbability: number, similarity: number): RiskLevel {
  const peak = Math.max(aiProbability, similarity);
  if (peak >= 70) return "high";
  if (peak >= 35) return "medium";
  return "low";
}

/**
 * 生成一次「自洽」的检测结果数值。
 * @param taskId 任务 id，缺省时回落 Math.random（调试用）
 * @param duration 音频时长（秒），用于约束片段位置
 */
export function generateRandomResult(taskId?: string, duration = 204): RandomResult {
  const rand = resolveRandom(taskId);
  const scenario = pickScenario(taskId);
  const def = SCENARIOS[scenario];

  const pick = ([min, max]: [number, number]) => min + rand() * (max - min);
  const aiProbability = Number(pick(def.ai).toFixed(1));
  const similarity = Number(pick(def.similarity).toFixed(1));

  // 相似度决定片段条数，再用场景允许区间截断
  const bySimilarity = similarity > 70 ? 2 : similarity >= 40 ? 1 : 0;
  const [segMin, segMax] = def.segments;
  const count = Math.min(segMax, Math.max(segMin, bySimilarity));

  const safeStart = Math.max(8, Math.round(duration * 0.12));
  const spanPerSeg = Math.max(30, Math.round((duration - safeStart) / Math.max(1, count)));
  const matchedSegments: MatchedSegment[] = [];
  for (let i = 0; i < count; i += 1) {
    const meta = SOURCES[Math.floor(rand() * SOURCES.length)];
    // 第一条贴近总相似度，后续逐条递减 —— 任何片段都不超过总相似度
    const raw =
      i === 0
        ? similarity * (0.94 + rand() * 0.06)
        : matchedSegments[i - 1].similarity - (3 + rand() * 9);
    // 按均分区间落位，保证片段互不重叠且在时间轴上递增
    const zoneStart = safeStart + i * spanPerSeg;
    const length = 9 + Math.floor(rand() * 9);
    const start = zoneStart + Math.floor(rand() * Math.max(1, spanPerSeg - length - 2));
    matchedSegments.push({
      id: `seg-${taskId ?? "rand"}-${i + 1}`,
      start: Math.min(duration - length, start),
      end: Math.min(duration, start + length),
      similarity: Number(Math.max(0, Math.min(raw, similarity)).toFixed(1)),
      sourceTitle: meta.sourceTitle,
      sourceArtist: meta.sourceArtist,
      source: meta.source,
    });
  }

  return {
    scenario,
    aiProbability,
    similarity,
    matchedSegments,
    riskLevel: riskOf(aiProbability, similarity),
  };
}
