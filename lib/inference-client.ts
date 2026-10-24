/**
 * 推理服务的浏览器端客户端。
 *
 * 默认请求同源的 /api/infer，由 next.config.mjs 的 rewrite 代理到
 * http://127.0.0.1:8000/api/detect —— 这样浏览器全程只看到自己的域，
 * 既没有 CORS 预检，也不会因为「https 页面请求 http 接口」被拦成混合内容。
 *
 * 想直连后端（比如换个端口）可以设置 NEXT_PUBLIC_INFERENCE_URL，
 * 后端那边已经放行了 localhost:3000 的跨域请求。
 */

import type { MatchedSegment, RiskLevel } from "./types";

export interface InferencePayload {
  aiProbability: number;
  similarity: number;
  matchedSegments: MatchedSegment[];
  /** false 表示后端没有真实的相似度/片段数据（本模型只输出 AI 概率） */
  similarityAvailable: boolean;
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
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_INFERENCE_TIMEOUT ?? 10_000);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 后端只保证三个必填字段，其余字段缺失时给安全默认值 */
function normalize(raw: unknown): InferencePayload {
  if (!raw || typeof raw !== "object") {
    throw new InferenceError("推理服务返回了非 JSON 对象");
  }
  const data = raw as Record<string, unknown>;
  const aiProbability = toNumber(data.aiProbability, Number.NaN);
  if (!Number.isFinite(aiProbability)) {
    throw new InferenceError("推理服务返回的数据缺少 aiProbability");
  }

  const segmentsRaw = Array.isArray(data.matchedSegments) ? data.matchedSegments : [];
  const matchedSegments: MatchedSegment[] = segmentsRaw
    .map((item, index) => {
      const seg = (item ?? {}) as Record<string, unknown>;
      const source = seg.source === "melody" ? "melody" : "fingerprint";
      return {
        id: typeof seg.id === "string" ? seg.id : `live-${index + 1}`,
        start: toNumber(seg.start),
        end: toNumber(seg.end),
        similarity: toNumber(seg.similarity),
        sourceTitle: typeof seg.sourceTitle === "string" ? seg.sourceTitle : "未知来源",
        sourceArtist: typeof seg.sourceArtist === "string" ? seg.sourceArtist : "",
        source,
        matchedAt: typeof seg.matchedAt === "string" ? seg.matchedAt : undefined,
      } satisfies MatchedSegment;
    })
    .filter((seg) => seg.end > seg.start);

  return {
    aiProbability: clamp(aiProbability, 0, 100),
    similarity: clamp(toNumber(data.similarity), 0, 100),
    matchedSegments,
    // 只有后端明确说 false 才视为「没有真实相似度」，缺省当作可用
    similarityAvailable: data.similarityAvailable !== false,
    riskLevel: data.riskLevel === "high" || data.riskLevel === "medium" ? data.riskLevel : "low",
    duration: toNumber(data.duration),
    segments: toNumber(data.segments),
    model: typeof data.model === "string" ? data.model : undefined,
    elapsedMs: toNumber(data.elapsedMs),
  };
}

export interface RunInferenceOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * 上传音频并取回推理结果。
 * 超时、断网、后端 5xx、返回体不合法，都会抛 InferenceError，
 * 交给调用方降级到演示数据。
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

    return normalize(await response.json());
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
