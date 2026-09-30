import type { DetectType, MatchedSegment, RiskLevel } from "./types";

/**
 * ─────────────────────────────────────────────────────────────
 *  检测报告本地持久化（纯前端，无后端）
 * ─────────────────────────────────────────────────────────────
 *  结果页点击「生成检测报告」→ addReport → 写入 localStorage
 *  报告中心 `?view=reports` → getReports → 渲染卡片列表
 *  刷新页面后依然可读回；清空浏览器存储则回落到空态。
 */

export const REPORTS_STORAGE_KEY = "ybs_reports";

/** 列表变更事件名，供同一页面内的多个组件互相感知 */
export const REPORTS_CHANGE_EVENT = "ybs:reports-change";

export interface ReportItem {
  /** 关联的检测任务 id */
  taskId: string;
  fileName: string;
  /** 存枚举值，展示时用 detectTypeLabel 转中文 */
  detectType: DetectType;
  aiProbability: number;
  similarity: number;
  riskLevel: RiskLevel;
  matchedSegments: MatchedSegment[];
  /** 点击「生成检测报告」那一刻的 ISO 时间 */
  createdAt: string;
  status: "已生成";
  reportNo: string;
}

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(REPORTS_CHANGE_EVENT));
}

function persist(reports: ReportItem[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // 隐私模式 / 配额超限：静默降级，不影响页面
  }
}

export function getReports(): ReportItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReportItem[]) : [];
  } catch {
    return [];
  }
}

/** 同一 taskId 已存在时更新，否则置顶插入 */
export function addReport(report: ReportItem): void {
  const reports = getReports();
  const index = reports.findIndex((item) => item.taskId === report.taskId);
  if (index >= 0) {
    reports[index] = { ...reports[index], ...report };
  } else {
    reports.unshift(report);
  }
  persist(reports);
  notify();
}

export function removeReport(taskId: string): void {
  persist(getReports().filter((item) => item.taskId !== taskId));
  notify();
}

export function clearReports(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(REPORTS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function hasReport(taskId: string): boolean {
  return getReports().some((item) => item.taskId === taskId);
}

/**
 * 订阅报告列表变更。
 * 双监听：同页面内的自定义事件 + 跨标签页的 storage 事件。
 */
export function subscribeReports(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === REPORTS_STORAGE_KEY) listener();
  };
  window.addEventListener(REPORTS_CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(REPORTS_CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
