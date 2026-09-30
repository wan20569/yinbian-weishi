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
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
