import type { DetectionResult, Task } from "./types";

/**
 * 工作台视图模型（纯函数，无副作用）
 *
 * 新设计稿里的「综合判定 / 置信度圆环 / 检测依据 / 多维分析」四块，
 * 原始数据模型（lib/types.ts）里并没有对应字段。为了做到「换皮不换骨」，
 * 这里统一用 DetectionResult 里已有的确定性数据（aiProbability / similarity /
 * evidenceChain / waveformData / matchedSegments）派生，不新增字段、
 * 不修改 lib/mock-data.ts，也不会产生 SSR / CSR 不一致。
 */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number) => Number(value.toFixed(1));

/* ── 综合判定 ─────────────────────────────────────────────── */

export interface VerdictSummary {
  isAi: boolean;
  headline: string;
  /** 判定方向的置信度 0-100 */
  confidence: number;
  aiProbability: number;
  humanProbability: number;
  /** 置信区间（围绕 AI 概率） */
  interval: [number, number];
  /** 分析耗时（秒，按音频时长确定性推导） */
  elapsed: number;
  highConfidence: boolean;
}

export function summarizeVerdict(result: DetectionResult): VerdictSummary {
  const aiProbability = round1(clamp(result.aiProbability, 0, 100));
  const isAi = aiProbability >= 50;
  const confidence = round1(clamp(52 + Math.abs(aiProbability - 50) * 1.08, 52, 99.4));
  const spread = Math.max(2.6, (100 - confidence) * 0.42 + 2.4);

  return {
    isAi,
    headline: isAi ? "AI 生成" : "人类创作",
    confidence,
    aiProbability,
    humanProbability: round1(100 - aiProbability),
    interval: [round1(clamp(aiProbability - spread, 0, 100)), round1(clamp(aiProbability + spread, 0, 100))],
    elapsed: Math.round(15 + (result.audioDuration % 9) + result.matchedSegments.length * 1.6),
    highConfidence: confidence >= 85,
  };
}

/** 代表任务：优先用户选中的任务，否则取最近一条已完成的任务 */
export function pickFeaturedTask(tasks: Task[], selectedId: string | null): Task | null {
  const selected = selectedId ? tasks.find((task) => task.id === selectedId) : undefined;
  if (selected) return selected;

  const done = tasks.filter((task) => task.status === "done" && task.result);
  if (done.length === 0) return tasks[0] ?? null;

  return [...done].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

/* ── 检测依据（四条进度条） ──────────────────────────────── */

export interface SignalItem {
  key: "spectrum" | "phase" | "transient" | "codec";
  label: string;
  score: number;
}

export function buildSignals(result: DetectionResult): SignalItem[] {
  const chain = result.evidenceChain;
  const cnn = chain.find((item) => item.key === "cnn")?.score ?? result.aiProbability;
  const fingerprint = chain.find((item) => item.key === "fingerprint")?.score ?? result.similarity;
  const melody = chain.find((item) => item.key === "melody")?.score ?? result.similarity * 0.7;

  const score = (value: number) => clamp(Math.round(value), 38, 99);

  return [
    { key: "spectrum", label: "频谱纹理", score: score(cnn * 0.98 + 4) },
    { key: "phase", label: "相位一致性", score: score(cnn * 0.86 + 6) },
    { key: "transient", label: "瞬态包络", score: score(melody * 0.72 + 22) },
    { key: "codec", label: "编解码指纹", score: score(cnn * 0.42 + fingerprint * 0.48 + 10) },
  ];
}

/* ── 多维分析（三张 SVG 图） ────────────────────────────── */

const CHART_W = 360;
const CHART_H = 120;
const BASELINE = 108;

type Point = { x: number; y: number };

/** 把任意长度的波形重采样成固定点数 */
function resample(values: number[], count: number): number[] {
  if (values.length === 0) {
    return Array.from({ length: count }, (_, i) => 0.32 + 0.26 * Math.abs(Math.sin(i * 0.7)));
  }
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = Math.floor((i / count) * values.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / count) * values.length));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += values[j] ?? 0;
    out.push(sum / (end - start));
  }
  return out;
}

/** Catmull-Rom → 三次贝塞尔，得到平滑曲线 */
function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface ChartGeometry {
  spectrum: { line: string; area: string; cutoffX: number };
  vocal: { line: string; area: string; band: { x: number; width: number } };
  rhythm: Array<{ x: number; y: number; height: number }>;
  width: number;
  height: number;
}

/**
 * 三张图全部由 waveformData 派生：
 * 换一个任务，频谱截断位置、人声包络、鼓点密度都会跟着变，
 * 答辩演示时「点卡片 → 图表联动」才站得住脚。
 */
export function buildCharts(result: DetectionResult): ChartGeometry {
  /* 频谱：高频段做滚降，模拟 16k 处截断 */
  const spectrumSeries = resample(result.waveformData, 26).map((value, index, list) => {
    const t = index / (list.length - 1);
    const rolloff = t > 0.6 ? Math.max(0.06, 1 - (t - 0.6) * 2.35) : 1;
    const amplitude = clamp(0.42 + value * 0.72, 0.08, 1) * rolloff;
    return { x: t * CHART_W, y: BASELINE - 6 - amplitude * (CHART_H - 44) };
  });
  const spectrumLine = smoothPath(spectrumSeries);
  const spectrumArea = `${spectrumLine} L${CHART_W} ${BASELINE} L0 ${BASELINE} Z`;

  /* 人声：中频段（200 Hz–4 kHz）能量凸起 */
  const vocalSeries = resample(result.waveformData, 22).map((value, index, list) => {
    const t = index / (list.length - 1);
    const gauss = Math.exp(-Math.pow((t - 0.42) * 2.1, 2));
    const amplitude = clamp((0.3 + value * 0.7) * (0.45 + gauss * 0.8), 0.1, 1);
    return { x: t * CHART_W, y: BASELINE - 10 - amplitude * (CHART_H - 52) };
  });
  const vocalLine = smoothPath(vocalSeries);
  const vocalArea = `${vocalLine} L${CHART_W} ${BASELINE} L0 ${BASELINE} Z`;

  /* 节奏：16 根鼓点柱，高度取波形均值的逆序，保证左右对称的“规律感” */
  const rhythm = resample(result.waveformData, 16).map((value, index) => {
    const height = Math.round(clamp(24 + value * 50, 22, 76));
    return { x: 12 + index * 22, y: BASELINE - height, height };
  });

  return {
    spectrum: { line: spectrumLine, area: spectrumArea, cutoffX: Math.round(CHART_W * 0.695) },
    vocal: { line: vocalLine, area: vocalArea, band: { x: 78, width: 188 } },
    rhythm,
    width: CHART_W,
    height: CHART_H,
  };
}

/* ── 侧栏 / 页头用的汇总 ─────────────────────────────────── */

export function buildOverview(tasks: Task[]) {
  const done = tasks.filter((task) => task.status === "done" && task.result);
  const aiHit = done.filter((task) => (task.result?.aiProbability ?? 0) >= 70).length;
  const avgSimilarity = done.length
    ? done.reduce((sum, task) => sum + (task.result?.similarity ?? 0), 0) / done.length
    : 0;
  const segments = done.reduce((sum, task) => sum + (task.result?.matchedSegments.length ?? 0), 0);

  return {
    total: tasks.length,
    aiHit,
    aiHitRate: done.length ? Math.round((aiHit / done.length) * 100) : 0,
    avgSimilarity: avgSimilarity.toFixed(1),
    segments,
  };
}
