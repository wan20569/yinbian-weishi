import { allMockTasks, buildFreshResult, mockTasks } from "@/lib/mock-data";
import type { ScenarioId } from "@/lib/random-result";
import type { DetectionResult, DetectType, Task } from "@/lib/types";
import { MOCK_NOW } from "@/lib/utils";

/**
 * 全局前端「内存数据库」。
 * 纯 mock：刷新页面即回落到 lib/mock-data.ts 的初始数据。
 */
const inMemoryTasks: Task[] = [...allMockTasks];

export function createTaskId() {
  const stamp = Date.now().toString();
  return `tsk_${stamp.slice(-8)}_${Math.floor(Math.random() * 900 + 100)}`;
}

export function registerTask(task: Task) {
  inMemoryTasks.unshift(task);
}

export function listTasks(): Task[] {
  return inMemoryTasks;
}

export function listMainTasks(): Task[] {
  return inMemoryTasks.filter((task) => mockTasks.some((item) => item.id === task.id));
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
  const index = inMemoryTasks.findIndex((task) => task.id === id);
  if (index === -1) return;
  inMemoryTasks[index] = { ...inMemoryTasks[index], ...update };
}

export function buildTaskResult(
  task: Task,
  forceScenario?: ScenarioId | null
): DetectionResult {
  if (task.result) return task.result;
  const fresh = buildFreshResult({
    taskId: task.id,
    fileName: task.fileName,
    detectType: task.detectType,
    duration: task.duration || 213,
    forceScenario: forceScenario ?? null,
  });
  // 写回内存态，便于「结果页 -> 工作台」回看时保持一致
  updateTaskResult(task.id, { result: fresh, status: "done", progress: 100 });
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
