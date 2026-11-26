"use client";

import * as React from "react";

import {
  INFERENCE_TIMEOUT_MS,
  runInference,
  type InferencePayload,
} from "@/lib/inference-client";
import { generateRandomResult, type RandomResult } from "@/lib/random-result";
import type { DetectionResult, Task } from "@/lib/types";

export type DetectionPhase = "parsing" | "cnn" | "fingerprint" | "melody" | "finished";

/** 真实推理的进展状态 */
export type InferenceStatus = "idle" | "skipped" | "loading" | "done" | "failed";

/**
 * 结果来源，用于界面徽章：
 *   model    模型实时判定
 *   failed   检测失败（模型请求失败 / 超时 / 返回体不合法）—— 不再用随机数冒充结果
 *   noFile   无原始音频（预设任务 / 刷新后内存文件丢失）—— 明确提示，不冒充结果
 */
export type ResultSource = "model" | "failed" | "noFile";

/**
 * 检测失败的明确原因。用于日志与页面可见提示，方便定位「时好时坏」的间歇性问题。
 */
export type FailureReason =
  | "no-file" // 没有可推理的原始音频（刷新后 File 丢失 / 预设任务）
  | "timeout" // 推理请求超时
  | "http-error" // 后端返回非 2xx
  | "invalid-payload" // 返回体不合法（缺字段 / 数值越界）
  | "aborted" // 请求被中断（切任务 / 组件卸载）
  | "network-error"; // 网络错误（断网 / DNS / CORS / 5xx 等）

export interface PhaseMeta {
  key: DetectionPhase;
  title: string;
  hint: string;
}

export const PHASES: PhaseMeta[] = [
  { key: "parsing", title: "解析音频", hint: "读取音频流 · 重采样 44.1kHz" },
  { key: "cnn", title: "AI 鉴别中", hint: "轻量 CNN 模型 · 声学特征判别" },
  { key: "fingerprint", title: "指纹比对中", hint: "音频指纹检索 · 片段对齐" },
  { key: "melody", title: "旋律特征提取中", hint: "旋律线 / 和弦 / 编曲特征" },
];

const THRESHOLDS: Array<{ until: number; phase: DetectionPhase }> = [
  { until: 12, phase: "parsing" },
  { until: 45, phase: "cnn" },
  { until: 78, phase: "fingerprint" },
  { until: 99, phase: "melody" },
];

/** 进度到这个值时开始请求模型：此时界面正好进到「AI 鉴别中」阶段 */
const INFERENCE_TRIGGER = 30;

function phaseOf(progress: number): DetectionPhase {
  if (progress >= 100) return "finished";
  const hit = THRESHOLDS.find((item) => progress < item.until);
  return hit ? hit.phase : "melody";
}

export interface DetectionSimulationOptions {
  /** 本次任务对应的原始音频；为空（如 6 条预设任务、刷新后丢失）时无法推理，改用种子随机 */
  file?: File | null;
}

/**
 * 模拟检测流水线：解析 -> AI 鉴别 -> 指纹比对 -> 旋律特征提取 -> 完成
 * 总时长约 4.5s。
 *
 * 真实推理在进度 30% 时后台发起，不阻塞进度条；进度到 100% 后若请求还没回来，
 * 会继续停在骨架屏等它（最长等于客户端超时时间）；失败则立即回落到场景化随机
 * 数据，页面不会白屏。
 */
export function useDetectionSimulation(
  task: Task | null,
  result: DetectionResult | null,
  options: DetectionSimulationOptions = {}
) {
  const { file = null } = options;

  const [progress, setProgress] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  // 场景化随机结果：初始 null，保证 SSR 首屏不出现随机值（避免 hydration 不一致）
  const [metrics, setMetrics] = React.useState<RandomResult | null>(null);
  // 模型真实返回
  const [live, setLive] = React.useState<InferencePayload | null>(null);
  const [inferenceStatus, setInferenceStatus] = React.useState<InferenceStatus>("idle");
  /** 是否真的发出过推理请求 —— 用来区分「没音频可测」和「测了但没拿到结果」 */
  const [attempted, setAttempted] = React.useState(false);
  /** 失败的具体原因，用于日志与页面可见提示 */
  const [failureReason, setFailureReason] = React.useState<FailureReason | null>(null);
  /** 重试计数：每次重试自增，用于触发推理 effect 重新执行 */
  const [retryTick, setRetryTick] = React.useState(0);

  const timerRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  /** 最新 task 的快照，供 effect 内部读取，避免把 task 放进依赖数组 */
  const taskRef = React.useRef<Task | null>(task);
  taskRef.current = task;

  const stop = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const cancelInference = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);
  React.useEffect(() => cancelInference, [cancelInference]);

  React.useEffect(() => {
    const taskId = taskRef.current?.id;
    if (!taskId) return;

    /**
     * 关键：依赖数组里不能出现 task 对象。
     *
     * 结果页的 task 是 useMemo([taskId, searchParams]) 算出来的，RSC 导航收尾时
     * searchParams 会换新引用、task 随之重建，effect 就会重跑：进度被重置成 0、
     * in-flight 请求被 abort、live 被清空，整页退回 scenario 随机数
     * （表现为「后端明明返回了，页面却是随机值」）。
     *
     * 现在依赖只有 stop / cancelInference（都是 useCallback([]) 的稳定引用），
     * 所以本 effect 只在挂载时执行一次，task 通过 ref 读取最新值。
     */
    const current = taskRef.current as Task;

    // 换任务时清掉上一个任务的真实结果与「已发起」标记
    firedRef.current = false;
    cancelInference();
    setLive(null);
    setInferenceStatus("idle");
    setAttempted(false);
    setFailureReason(null);

    // 随机只在副作用里跑一次：同一 taskId 结果稳定，且不在 render 阶段调用随机函数
    setMetrics(generateRandomResult(current.id, current.duration || 204));

    // 历史已完成的任务直接呈现结果，不重跑动画
    if (current.status === "done" && current.result) {
      setProgress(100);
      setStarted(true);
      return;
    }
    setProgress(0);
    setStarted(false);

    const kickoff = window.setTimeout(() => {
      setStarted(true);
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 100;
          const next = prev + 0.8 + Math.random() * 1.1;
          return next >= 100 ? 100 : next;
        });
      }, 60);
    }, 420);

    return () => {
      window.clearTimeout(kickoff);
      stop();
    };
  }, [stop, cancelInference]);

  /**
   * 到 100% 就收掉定时器。
   *
   * 这里必须放在 effect 里，不能像以前那样写在 setProgress 的 updater 内：
   * updater 在 StrictMode 下会被双调用、并发渲染时还可能被整次丢弃。一旦
   * 「跨过 100% 的那次调用」被丢弃，updater 里的 stop() 已经把定时器清掉了，
   * 而提交出去的进度还停在 99.x —— 结果就是进度条看着是 100%（Math.round
   * 取整）、文案还是「检测进行中」、phase 永远到不了 finished，
   * 即使模型结果早就返回（inferenceStatus 已是 done）页面也不出结果。
   */
  React.useEffect(() => {
    if (progress >= 100) stop();
  }, [progress, stop]);

  /** 进度过 30% 时发起一次真实推理（只发一次） */
  React.useEffect(() => {
    if (firedRef.current) return;
    const currentTaskId = taskRef.current?.id;
    if (!currentTaskId) return;
    if (progress < INFERENCE_TRIGGER) return;

    /**
     * 拿不到原始文件（预设任务 / 刷新后内存清空）就没法推理。
     * 这里不再把它当成「随机结果」，而是明确标记为「无原始音频」的失败态，
     * 由 UI 渲染「请重新上传」提示，绝不用随机数冒充检测结论。
     *
     * 注意这里不能顺手置 firedRef —— file 是在另一个 effect 里异步 set 的，
     * 首帧读到 null 是正常现象。若此时就把「机会」用掉，等 File 到位后
     * 这个 effect（依赖里有 file）虽然会重跑，却会因为 firedRef 已为 true 而
     * 直接 return，请求永远不会发出去。把标记放到真正发请求之前，晚到的 file 还能补发。
     */
    if (!file) {
      setInferenceStatus("skipped");
      return;
    }

    firedRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    setAttempted(true);
    setInferenceStatus("loading");
    setFailureReason(null);

    /**
     * 只认「当前这次请求」的结果。
     *
     * 这里不能用 controller.signal.aborted 做判断：请求被中断（切任务、
     * Fast Refresh 重建组件）时 abort 先于 then/catch 执行，一旦在 then 里
     * 直接 return，inferenceStatus 就永远停在 "loading"，
     * 而 isFinished 依赖它 —— 页面会卡在 100% 骨架屏（后端其实早就返回了）。
     *
     * 正确做法是比较 abortRef：被新请求取代才丢弃，否则一定要落状态。
     */
    const isCurrent = () => abortRef.current === controller;

    runInference(file, { signal: controller.signal })
      .then((payload) => {
        if (!isCurrent()) {
          console.info("[detect] 丢弃过期请求的返回结果");
          return;
        }
        abortRef.current = null;
        setLive(payload);
        setInferenceStatus("done");
      })
      .catch((error: unknown) => {
        if (!isCurrent()) {
          console.info("[detect] 丢弃过期请求的错误");
          return;
        }
        abortRef.current = null;
        // 分类失败原因：便于日志与页面提示，定位「时好时坏」的间歇性问题
        const reason = classifyFailure(error);
        console.warn(`[detect] 模型推理失败（原因: ${reason}）：`, error);
        setFailureReason(reason);
        setInferenceStatus("failed");
      });
  }, [progress, file, retryTick]);

  /**
   * 看门狗：万一请求既没成功也没失败（极端竞态 / 进程被挂起），
   * 超过超时预算还没落状态就强制失败，保证页面不会永远停在骨架屏。
   */
  React.useEffect(() => {
    if (inferenceStatus !== "loading") return;
    const timer = window.setTimeout(() => {
      setInferenceStatus((prev) => {
        if (prev !== "loading") return prev;
        console.warn("[detect] 推理请求超过预算未返回，已强制失败（原因: timeout）");
        setFailureReason("timeout");
        return "failed";
      });
    }, INFERENCE_TIMEOUT_MS + 2_000);
    return () => window.clearTimeout(timer);
  }, [inferenceStatus]);

  const phase = phaseOf(progress);
  const phaseIndex = PHASES.findIndex((item) => item.key === phase);
  // 进度到 100 但模型还没回 → 继续停在骨架屏，避免先闪一下假数据再跳变
  const waitingForInference = inferenceStatus === "loading";
  const isFinished = progress >= 100 && !!result && !waitingForInference;

  /**
   * 三态数据来源，直接对应界面徽章：
   *   model  —— 模型返回成功，界面用真实数值
   *   failed —— 发出过请求但没拿到结果（超时 / 5xx / 被中断 / 返回体不合法），
   *             现在不再用随机数冒充结果，而是渲染「检测失败」错误态
   *   noFile —— 根本没有音频可推理（预设任务、刷新后 File 丢失），渲染「请重新上传」
   */
  const source: ResultSource = live
    ? "model"
    : attempted || inferenceStatus === "failed"
      ? "failed"
      : "noFile";

  /**
   * 重试：清空失败态与「已发起」标记，让推理 effect 重新跑一次。
   * 仅在失败/无音频且没有可推理文件时提供（noFile 态不提供，因为没文件重试也无意义，
   * 应引导用户重新上传）。
   */
  const retry = React.useCallback(() => {
    // 只有真的失败过（有 file 但请求失败）才允许重试；无音频态重试无意义
    if (inferenceStatus === "failed" || attempted) {
      firedRef.current = false;
      setLive(null);
      setFailureReason(null);
      setInferenceStatus("idle");
      setAttempted(false);
      setRetryTick((n) => n + 1);
      console.info("[detect] 用户手动重试检测");
    }
  }, [inferenceStatus, attempted]);

  return {
    progress,
    phase,
    phaseIndex: phaseIndex === -1 ? PHASES.length : phaseIndex,
    isFinished,
    started,
    metrics,
    live,
    inferenceStatus,
    /** 本地链路已跑完、只差模型返回：界面据此展示「等待模型返回」，而不是装作卡死 */
    waitingForInference,
    source,
    failureReason,
    retry,
  };
}

/**
 * 把 runInference 抛出的错误归类为明确的失败原因，供日志与页面提示。
 * 这里不吞细节：原始 error 会在调用处一并 console.warn 打印出来。
 */
function classifyFailure(error: unknown): FailureReason {
  const msg = error instanceof Error ? error.message : String(error);
  if (/超时|timeout|timed out/i.test(msg)) return "timeout";
  // InferenceError 带 status：后端返回了非 2xx
  const status = (error as { status?: number }).status;
  if (typeof status === "number") return "http-error";
  if (/abort/i.test(msg)) return "aborted";
  // 返回体不合法（缺字段 / 数值越界）—— InferenceError 无 status 且 message 含字段提示
  if (msg.includes("不是有效数字") || msg.includes("超出 0~100") || msg.includes("不是 JSON")) {
    return "invalid-payload";
  }
  return "network-error";
}
