import type { ScenarioId } from "./random-result";

/**
 * ─────────────────────────────────────────────────────────────
 *  答辩演示脚本
 * ─────────────────────────────────────────────────────────────
 *  目的：让「前两次检测」的结果可控，方便答辩时讲一个完整的故事
 *    第 1 次 -> human_original（原创作品，曲库溯源命中）
 *    第 2 次 -> ai_copy      （AI 生成 + 检出抄袭片段）
 *    第 3 次起 -> 恢复场景化随机
 *
 *  计数存在 localStorage（key: ybs_detect_count），
 *  只在「上传完成、跳转结果页」那一刻递增一次，刷新结果页不会重复计数。
 *
 *  ⚠️ 重要：演示脚本只对「上传页跳转过来的任务」生效。
 *     计数通过 URL 参数 `dc` 传递，lib/mock-data.ts 里那 6 条预设任务
 *     的 URL 不带 dc，永远走种子随机 —— 否则服务端渲染读不到 localStorage
 *     （返回 0）而客户端读到 2，会造成 hydration mismatch。
 */

export const DETECT_COUNT_KEY = "ybs_detect_count";

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

/** 读取当前演示计数，默认 0 */
export function getDetectCount(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = window.localStorage.getItem(DETECT_COUNT_KEY);
    const value = Number.parseInt(raw ?? "0", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** 计数 +1 并写回，返回新值（只在「上传完成、跳转结果页」时调用） */
export function incrementDetectCount(): number {
  const next = getDetectCount() + 1;
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(DETECT_COUNT_KEY, String(next));
  } catch {
    /* 隐私模式 / 配额超限：静默降级，页面不崩 */
  }
  return next;
}

/** 清零，用于反复演示 */
export function resetDetectCount(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(DETECT_COUNT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 演示脚本：前两次检测钉死场景。
 * @returns 场景 id；返回 null 表示走原有的种子随机逻辑
 */
export function getDemoScenario(count: number): ScenarioId | null {
  if (count === 1) return "human_original";
  if (count === 2) return "ai_copy";
  return null;
}

// ─────────────────────────── 演示卡片 ───────────────────────────

export interface DemoTrackInfo {
  /** 曲名 */
  name: string;
  /** 演唱者 */
  artist: string;
  /** 发行信息 */
  release: string;
}

export interface DemoScriptCard {
  /** 第几次检测 */
  count: number;
  scenario: ScenarioId;
  title: string;
  badge: string;
  /** safe = 主色（原创），danger = 危险色（AI 高危） */
  tone: "safe" | "danger";
  /** 卡片右上角的小字状态 */
  aside: string;
  message: string;
  /** 曲库溯源信息，仅第 1 次（原创作品）有 */
  track?: DemoTrackInfo;
  /** 曲库溯源区上方的一句桥接文案，把「上传的文件」和「识别结果」连起来 */
  bridge?: string;
  /**
   * 要点列表。占位符会在渲染时替换：
   *   {n}   -> 命中片段数
   *   {max} -> 最高片段相似度
   */
  bullets?: string[];
}

export const DEMO_SCRIPT_CARDS: Record<number, DemoScriptCard> = {
  1: {
    count: 1,
    scenario: "human_original",
    title: "曲库溯源 · 原创作品识别",
    badge: "原创作品 · 未检出 AI 特征",
    tone: "safe",
    aside: "曲库溯源完成",
    bridge: "已匹配至曲库作品",
    message:
      "该音频已匹配至曲库已登记的原创作品，未检出 AI 生成特征，亦未发现与第三方作品的重合片段。",
    track: {
      name: "《夜色频率》",
      artist: "陈屿",
      release: "2024 独立发行",
    },
    bullets: [
      "作品登记号 YBS-ORI-2024-0912",
      "著作权人 陈屿 · 首次登记 2024-03-18",
      "声纹比对 未命中任何 AI 声库样本",
    ],
  },
  2: {
    count: 2,
    scenario: "ai_copy",
    title: "AI 生成特征识别",
    badge: "AI 生成 · 高危",
    tone: "danger",
    aside: "风险等级 高危",
    message:
      "该音频具有高度 AI 生成特征，且检出多处与已知作品相似的片段，建议下架核查后再发行。",
    bullets: [
      "检出相似片段 {n} 处，最高片段相似度 {max}%",
      "声码器伪影显著，人声自然度低于正常阈值",
      "建议处置 下架核查 / 补充授权后再发行",
    ],
  },
};

/** 取当前计数对应的卡片；第 3 次及以后返回 null */
export function getDemoCard(count: number): DemoScriptCard | null {
  return DEMO_SCRIPT_CARDS[count] ?? null;
}

/** 把 bullets 里的占位符替换成当次检测的真实数值 */
export function fillDemoBullets(
  bullets: string[],
  segments: Array<{ similarity: number }>
): string[] {
  const count = segments.length;
  const max = count > 0 ? Math.max(...segments.map((item) => item.similarity)) : 0;
  return bullets.map((item) =>
    item.replace("{n}", String(count)).replace("{max}", max.toFixed(1))
  );
}
