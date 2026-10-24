/**
 * 上传文件在「上传页 → 结果页」之间的内存暂存。
 *
 * 为什么需要它：路由跳转后组件树被卸载，File 对象不会跟着 URL 走；
 * 而 File 又没法塞进 localStorage（二进制太大、序列化不了）。
 * 所以用一个模块级 Map 按 taskId 暂存，只在浏览器侧生效。
 *
 * 注意：
 *  - 模块级状态有 SSR 污染风险，这里所有读写都加了 typeof window 守卫，
 *    服务端永远读不到也写不进（同 lib/mock-service.ts 那条红线）。
 *  - 刷新页面后 Map 自然清空，此时拿不到 File，调用方会回落到演示数据，
 *    不会白屏。
 */

const MAX_ENTRIES = 5;
const files = new Map<string, File>();

export function stashFile(taskId: string, file: File): void {
  if (typeof window === "undefined") return;

  files.set(taskId, file);
  // 只保留最近几次上传，避免连续演示时把几百 MB 音频留在内存里
  while (files.size > MAX_ENTRIES) {
    const oldest = files.keys().next().value;
    if (oldest === undefined) break;
    files.delete(oldest);
  }
}

export function getStashedFile(taskId: string): File | null {
  if (typeof window === "undefined") return null;
  return files.get(taskId) ?? null;
}

export function dropStashedFile(taskId: string): void {
  if (typeof window === "undefined") return;
  files.delete(taskId);
}
