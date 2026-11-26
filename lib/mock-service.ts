import { buildFreshResult } from "@/lib/mock-data";
import type { DetectionResult, DetectType, Task } from "@/lib/types";
import { MOCK_NOW } from "@/lib/utils";

/**
 * ⚠️ 服务端单例警告（重要）
 *
 * `inMemoryTasks` 是**模块级可变单例**。在 Next.js App Router 下，标记为 "use client" 的组件
 * 依然会在服务端预渲染一次（SSR），此时本模块会在 Node 进程里被求值并**跨请求共享同一份数组**。
 * 因此 SSR 期间对本数组的任何写入（unshift / 赋值 / sort 原地排序）都会永久污染服务端状态：
 * 之后所有请求的预渲染 HTML 都带着被改写的 status/progress/result，
 * 而客户端 hydrate 时用的是干净的初始副本 → 必然 hydration mismatch。
 *
 * 规则：
 *  1. 所有写操作（registerTask / updateTaskResult）必须先过 `typeof window === "undefined"` 守卫。
 *  2. 服务端只读；需要「算出来的结果」时只计算并返回，不写回。
 *  3. listTasks() 一律返回浅拷贝，禁止把内部数组引用交出去被原地排序/修改。
 *  4. 结果必须是确定性可复现的（种子 PRNG），两端才能算出同样的值。
 *
 * 初始为空：原先这里用 allMockTasks 填入 8 条演示任务，
 * 现已移除——工作台与检测中心只展示本次会话真实上传的任务，
 * 空态由 EmptyState 承接。刷新页面后内存态清空，属于预期行为。
 */
const inMemoryTasks: Task[] = [];

/** 是否运行在浏览器（客户端）。服务端一律返回 false。 */
function isBrowser() {
  return typeof window !== "undefined";
}

export function createTaskId() {
  const stamp = Date.now().toString();
  return `tsk_${stamp.slice(-8)}_${Math.floor(Math.random() * 900 + 100)}`;
}

export function registerTask(task: Task) {
  // 服务端预渲染阶段禁止写入，否则污染跨请求共享的单例（见上方警告）
  if (!isBrowser()) return;
  inMemoryTasks.unshift(task);
}

export function listTasks(): Task[] {
  // 浅拷贝：调用方可以随意 sort / slice，不会写坏单例
  return [...inMemoryTasks];
}

export function getTaskById(id: string): Task | undefined {
  return inMemoryTasks.find((task) => task.id === id);
}

/**
 * 兜底：直接访问 /detect/xxx 或刷新页面后仍能渲染出一个完整结果页
 */
export function resolveTask(id: string): Task {
  const found = getTaskById(id);
  if (found) return found;

  const fileName = "上传作品_audio.mp3";
  return {
    id,
    fileName,
    fileSize: 9_640_000,
    duration: 213,
    createdAt: new Date(MOCK_NOW).toISOString(),
    status: "analyzing",
    detectType: "comprehensive",
    progress: 0,
  };
}

export function updateTaskResult(id: string, update: Partial<Task>) {
  // 服务端预渲染阶段禁止写入，否则污染跨请求共享的单例（见文件顶部警告）
  if (!isBrowser()) return;
  const index = inMemoryTasks.findIndex((task) => task.id === id);
  if (index === -1) return;
  inMemoryTasks[index] = { ...inMemoryTasks[index], ...update };
}

export function buildTaskResult(task: Task): DetectionResult {
  if (task.result) return task.result;
  const fresh = buildFreshResult({
    taskId: task.id,
    fileName: task.fileName,
    detectType: task.detectType,
    duration: task.duration || 213,
  });
  // ⚠️ 不再把「随机结果」写回内存态并标记为 done。
  // 之前的写法会在结果页一打开（真实检测还没跑完）就把任务写成「已完成 + 随机结果」，
  // 导致检测失败/进行中时，工作台与检测中心列表里仍显示一条带随机风险等级的「已完成」任务，
  // 这是「随机数冒充真实检测结论」的最隐蔽泄漏点。
  // 现在：真实结果由结果页在「模型成功返回」后显式写回（见 detect/[taskId]/page.tsx），
  // 失败则标记为 failed；buildTaskResult 只负责返回渲染兜底结构，不碰任务状态。
  return fresh;
}

export const detectTypeMap: Record<DetectType, string> = {
  ai: "AI 鉴别",
  plagiarism: "抄袭检测",
  comprehensive: "综合检测",
};

/** 模拟「生成报告」耗时 */
export function simulateReportGeneration(): Promise<{ reportNo: string }> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ reportNo: `YBS-${Date.now().toString().slice(-10)}` });
    }, 1500);
  });
}
