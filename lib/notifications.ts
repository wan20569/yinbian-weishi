import { formatRelativeTime } from "./utils";

/** 通知类型 → 决定左侧状态图标的颜色与图形 */
export type NotificationType = "success" | "danger" | "info";

/** 通知分类 → 对应通知中心页面的「系统消息」Tab */
export type NotificationCategory = "detection" | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  /** 一行标题，如「检测完成」 */
  title: string;
  /** 折叠态摘要，一到两句 */
  description: string;
  /** 展开后的全文，可多段（用 \n\n 分段） */
  detail: string;
  /** ISO 时间串 */
  createdAt: string;
}

/**
 * 通知数据（下拉面板与 /notifications 页面共用同一份）。
 * 当前未接入真实通知源，暂为空列表——铃铛不显示红点、页面显示空状态。
 * 后续接入真实通知时，向此数组填充 NotificationItem 即可。
 */
export const mockNotifications: NotificationItem[] = [];

/** 面板只展示最新若干条，完整列表走 /notifications */
export const NOTIFICATION_PANEL_LIMIT = 4;

/** 最新在前（mock 已按时间倒序排列，这里显式排序以防后续插入顺序被打乱） */
export function listNotifications(): NotificationItem[] {
  return [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** 文案在渲染阶段直接由固定基准换算，不调用 Date.now()，避免 hydration mismatch */
export function notificationTimeLabel(item: NotificationItem): string {
  return formatRelativeTime(item.createdAt);
}

/** 未读状态持久化在 localStorage，只存「已读的 id 列表」，新增通知会自动重新计为未读 */
export const NOTIFICATION_READ_KEY = "yinbian.notifications.readIds";

export function loadReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_READ_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    // 隐私模式 / 存储被禁用 / JSON 损坏 → 视作全部未读，不阻断交互
    return [];
  }
}

export function saveReadIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(ids));
  } catch {
    // 写入失败（配额 / 无痕模式）时静默降级，本次会话内仍然按内存状态工作
  }
}

/** 已读 id 列表 → 未读条数（readIds 为 null 表示尚未从 localStorage 读到，按全部未读处理） */
export function countUnread(readIds: string[] | null, items: NotificationItem[] = mockNotifications) {
  if (readIds === null) return items.length;
  return items.filter((item) => !readIds.includes(item.id)).length;
}
