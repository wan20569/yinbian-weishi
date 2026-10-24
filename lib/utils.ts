import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 秒 -> mm:ss */
export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTimeLabel(seconds: number) {
  return `00:${String(Math.max(0, Math.floor(seconds))).padStart(2, "0")}`;
}

/** 秒 -> mm:ss（不带前导 00） */
export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Mock 时间基准。
 * 固定基准可保证「服务端预渲染」与「客户端 hydration」得到完全一致的时间文案，
 * 避免 startTime / Math.now 造成的 hydration mismatch。
 */
export const MOCK_NOW = new Date("2026-09-30T18:30:00+08:00").getTime();

/**
 * 固定的 UTC+8（东八区）偏移。
 *
 * 时间文案一律按固定时区手工计算，绝不依赖运行环境的本地时区与 ICU：
 * 服务端（Node）与浏览器可能处于不同 TZ / 不同 ICU 数据版本，
 * `getHours()` 或 `toLocaleDateString("zh-CN")` 的产出会不一致 → hydration mismatch。
 */
const FIXED_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 把任意时刻换算成「东八区日历字段」，两端结果恒定 */
function fixedTzParts(date: Date) {
  const shifted = new Date(date.getTime() + FIXED_TZ_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** 相对时间（以 MOCK_NOW 为基准，保证 SSR/CSR 一致） */
export function formatRelativeTime(iso: string, now: number = MOCK_NOW) {
  const target = new Date(iso).getTime();
  const diff = now - target;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  // 手写 YYYY/M/D：不用 toLocaleDateString，避免 Node / 浏览器 ICU 差异
  const { year, month, day } = fixedTzParts(new Date(iso));
  return `${year}/${month}/${day}`;
}

/** 绝对时间（固定 UTC+8，保证 SSR/CSR 一致） */
export function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const { year, month, day, hours, minutes } = fixedTzParts(date);
  return `${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
