/**
 * 推理服务的浏览器端客户端。
 *
 * 默认请求同源的 /api/infer，由 next.config.mjs 的 rewrite 代理到
 * http://127.0.0.1:8000/api/detect —— 这样浏览器全程只看到自己的域，
 * 既没有 CORS 预检，也不会因为「https 页面请求 http 接口」被拦成混合内容。
 *
 * 想直连后端（比如换个端口）可以设置 NEXT_PUBLIC_INFERENCE_URL，
 * 后端那边已经放行了 localhost:3000 的跨域请求。
 *
 * ── 校验策略 ──
 * 这里只做「防前端被脏数据带崩」的校验，不做任何补值：
 *   · aiProbability 必须是数字且换算后落在 0~100，否则直接抛错（宁可不展示，也不展示错的）
 *   · similarity 缺失 → 视为「未进行声纹比对」，记 0 并标记 similarityAvailable=false
 *   · similarity 存在但不是数字 / 越界 → 抛错（说明后端契约坏了，不该静默吞掉）
 *   · matchedSegments 不是数组 → 强制空数组
 */

import type { Breakpoint, MatchedSegment, RiskLevel } from "./types";

export interface InferencePayload {
  aiProbability: number;
  similarity: number;
  matchedSegments: MatchedSegment[];
  /** false 表示后端没有真实的相似度/片段数据（本模型只输出 AI 概率） */
  similarityAvailable: boolean;
  /** 逐窗概率峰值 */
  aiProbabilityPeak?: number;
  /** 参与推理的窗口数 */
  windows?: number;
  /** 逐窗概率（单位 %），顺序对应滑窗顺序 */
  windowProbabilities?: number[];
  /** 风格断裂点 */
  breakpoints?: Breakpoint[];
  /** P(AI) > 60% 的窗口个数；仅展示，不参与判决 */
  strongWindowCount?: number;
  riskLevel?: RiskLevel;
  duration?: number;
  segments?: number;
  model?: string;
  elapsedMs?: number;
}

export class InferenceError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "InferenceError";
  }
}

const ENDPOINT = process.env.NEXT_PUBLIC_INFERENCE_URL || "/api/infer";

/**
 * 默认超时 60s。
 *
 * 原来是 10s，只在 localhost 够用：本机推理是毫秒级，10s 基本等于「后端没起来」的判据。
 * 走公网（Cloudflare 隧道 / 远程部署）时，这个预算要同时覆盖三段时间——
 * 音频上传、服务端解码与分窗推理、结果回传，10s 正常就会被打穿，
 * 表现为 InferenceError 超时并降级为随机结果。
 *
 * 为什么不是 120s：Cloudflare 代理对单次 HTTP 请求有 100s 的源站等待上限，
 * 超过会直接返回 524。60s 留足了余量，又能保证超时错误来自我们自己而不是 CDN。
 * 需要更长的部署环境可以用 NEXT_PUBLIC_INFERENCE_TIMEOUT 覆盖。
 */
const FALLBACK_TIMEOUT_MS = 60_000;

/** 环境变量可能被写成非数字，退化成 NaN 会让 setTimeout 立即触发，这里兜回默认值 */
function readTimeoutFromEnv(): number {
  const raw = process.env.NEXT_PUBLIC_INFERENCE_TIMEOUT;
  if (!raw) return FALLBACK_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_TIMEOUT_MS;
}

/** 导出给调用方做看门狗用（保证请求一定会落状态） */
export const INFERENCE_TIMEOUT_MS = readTimeoutFromEnv();
const DEFAULT_TIMEOUT_MS = INFERENCE_TIMEOUT_MS;
const IS_DEV = process.env.NODE_ENV !== "production";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 统一保留 1 位小数，避免 10.399999 这类浮点尾巴和页面显示不一致 */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * 把后端的概率字段换算成 0~100 的百分数。
 *
 * 兼容两种写法：0.85（0~1 的小数）和 85（百分数）。
 * 判据是「0 < v <= 1 视为小数比例」，所以 0 保持 0、1 会被当成 100%。
 * 这是刻意的取舍：模型输出范围是 0~100，出现 1 以下的正数只会是比例写法。
 */
function toPercent(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    // 数字用 String 打印（NaN/Infinity 用 JSON.stringify 会变成 null，看着像字段缺失）
    const shown = typeof value === "number" ? String(value) : JSON.stringify(value);
    throw new InferenceError(
      `${field} 不是有效数字（收到 ${shown}，类型 ${typeof value}）`
    );
  }
  const scaled = value > 0 && value <= 1 ? value * 100 : value;
  if (scaled < 0 || scaled > 100) {
    throw new InferenceError(`${field} 超出 0~100 范围（收到 ${value}）`);
  }
  return round1(scaled);
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** 逐窗概率数组清洗：必须是数值数组，单位已是 %，逐项夹到 0-100 */
function normalizeWindowProbabilities(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: number[] = [];
  for (const item of raw) {
    if (typeof item !== "number" || !Number.isFinite(item)) return undefined;
    out.push(clamp(round1(item), 0, 100));
  }
  return out.length > 0 ? out : undefined;
}

/** 断裂点数组清洗：字段不全或区间非法的直接丢弃 */
function normalizeBreakpoints(raw: unknown): Breakpoint[] {
  if (!Array.isArray(raw)) return [];
  const out: Breakpoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const bp = item as Record<string, unknown>;
    const start = optionalNumber(bp.start);
    const end = optionalNumber(bp.end);
    const jump = optionalNumber(bp.jump);
    const direction =
      bp.direction === "ai_to_human" || bp.direction === "human_to_ai"
        ? bp.direction
        : undefined;
    if (start === undefined || end === undefined || jump === undefined || !direction) continue;
    if (end <= start) continue;
    out.push({ start, end, jump: round1(jump), direction });
  }
  return out;
}

/** 片段数组必须做严格清洗，避免后端字段缺失时把 undefined 塞进 UI */
function normalizeSegments(raw: unknown): MatchedSegment[] {
  if (!Array.isArray(raw)) {
    if (IS_DEV && raw !== undefined) {
      console.warn("[Model API] matchedSegments 不是数组，已强制为空数组：", raw);
    }
    return [];
  }

  return raw
    .map((item, index) => {
      const seg = (item ?? {}) as Record<string, unknown>;
      return {
        id: typeof seg.id === "string" ? seg.id : `live-${index + 1}`,
        start: optionalNumber(seg.start) ?? 0,
        end: optionalNumber(seg.end) ?? 0,
        similarity: optionalNumber(seg.similarity) ?? 0,
        sourceTitle: typeof seg.sourceTitle === "string" ? seg.sourceTitle : "未知来源",
        sourceArtist: typeof seg.sourceArtist === "string" ? seg.sourceArtist : "",
        source: seg.source === "melody" ? ("melody" as const) : ("fingerprint" as const),
        matchedAt: typeof seg.matchedAt === "string" ? seg.matchedAt : undefined,
      } satisfies MatchedSegment;
    })
    // end <= start 的片段没有时间跨度，画到波形上会变成一个点
    .filter((seg) => seg.end > seg.start);
}

/**
 * 把后端返回的原始 JSON 整理成前端可用结构（内部使用，同时导出便于单测）。
 * 抛出的 InferenceError 会被 runInference 原样传给调用方。
 */
export function normalizeInferencePayload(raw: unknown): InferencePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new InferenceError("推理服务返回的不是 JSON 对象");
  }
  const data = raw as Record<string, unknown>;

  // aiProbability 是唯一不可缺的字段：缺了就没法出结论，直接抛错降级
  const aiProbability = toPercent(data.aiProbability, "aiProbability");

  // similarity 缺失 ≠ 0 分，而是「这项没测」——用 available 区分，不能默认当成 0 分
  const hasSimilarity = data.similarity !== undefined && data.similarity !== null;
  const similarity = hasSimilarity ? toPercent(data.similarity, "similarity") : 0;
  const similarityAvailable = hasSimilarity && data.similarityAvailable !== false;

  const duration = optionalNumber(data.duration);
  const segments = optionalNumber(data.segments);
  const peak = optionalNumber(data.aiProbabilityPeak);

  return {
    aiProbability,
    similarity,
    matchedSegments: normalizeSegments(data.matchedSegments),
    similarityAvailable,
    aiProbabilityPeak: peak === undefined ? undefined : clamp(round1(peak), 0, 100),
    windows: segments,
    windowProbabilities: normalizeWindowProbabilities(data.windowProbabilities),
    breakpoints: normalizeBreakpoints(data.breakpoints),
    strongWindowCount: optionalNumber(data.strongWindowCount),
    riskLevel:
      data.riskLevel === "high" || data.riskLevel === "medium" || data.riskLevel === "low"
        ? data.riskLevel
        : undefined,
    duration: duration !== undefined && duration > 0 ? round1(duration) : undefined,
    segments,
    model: typeof data.model === "string" ? data.model : undefined,
    elapsedMs: optionalNumber(data.elapsedMs),
  };
}

export interface RunInferenceOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * 上传音频并取回推理结果。
 * 超时、断网、后端 5xx、返回体不合法，都会抛 InferenceError，
 * 交给调用方降级到随机结果。
 */
export async function runInference(
  file: File,
  options: RunInferenceOptions = {}
): Promise<InferencePayload> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 外部取消（组件卸载 / 切换任务）时一并中断
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort);

  const form = new FormData();
  form.append("file", file, file.name || "audio.mp3");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === "string") detail = body.detail;
      } catch {
        // 后端没返回 JSON 就用状态码
      }
      throw new InferenceError(detail, response.status);
    }

    const raw: unknown = await response.json();
    const payload = normalizeInferencePayload(raw);

    // 开发期对账用：这条与 Network 面板里的 Response 完全同源，可以直接逐字比对
    if (IS_DEV) {
      console.info(`[Model API] 后端返回结果: ${JSON.stringify(raw)}`);
      console.info(
        `[Model API] 归一化后: ${JSON.stringify({
          aiProbability: payload.aiProbability,
          similarity: payload.similarity,
          similarityAvailable: payload.similarityAvailable,
          matchedSegments: payload.matchedSegments.length,
          duration: payload.duration,
          windows: payload.windows,
        })}`
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof InferenceError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new InferenceError(`推理请求超时（${timeoutMs}ms）`);
    }
    throw new InferenceError(
      error instanceof Error ? `推理请求失败：${error.message}` : "推理请求失败"
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
