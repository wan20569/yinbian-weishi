"use client";

import * as React from "react";

import { runInference, type InferencePayload } from "@/lib/inference-client";
import { generateRandomResult, type RandomResult } from "@/lib/random-result";
import type { DetectionResult, Task } from "@/lib/types";

export type DetectionPhase = "parsing" | "cnn" | "fingerprint" | "melody" | "finished";

/** 真实推理的进展状态 */
export type InferenceStatus = "idle" | "skipped" | "loading" | "done" | "failed";

/**
 * 结果来源，用于界面徽章：
 *   model    模型实时判定
 *   fallback 模型推理失败 · 已降级随机
 *   scenario 无原始音频 · 随机结果
 */
export type ResultSource = "model" | "scenario" | "fallback";

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

  const timerRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);

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
    if (!task) return;

    // 换任务时清掉上一个任务的真实结果与「已发起」标记
    firedRef.current = false;
    cancelInference();
    setLive(null);
    setInferenceStatus("idle");

    // 随机只在副作用里跑一次：同一 taskId 结果稳定，且不在 render 阶段调用随机函数
    setMetrics(generateRandomResult(task.id, task.duration || 204));

    // 历史已完成的任务直接呈现结果，不重跑动画
    if (task.status === "done" && task.result) {
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
          const next = prev + 0.8 + Math.random() * 1.1;
          if (next >= 100) {
            stop();
            return 100;
          }
          return next;
        });
      }, 60);
    }, 420);

    return () => {
      window.clearTimeout(kickoff);
      stop();
    };
  }, [task, stop, cancelInference]);

  /** 进度过 30% 时发起一次真实推理（只发一次） */
  React.useEffect(() => {
    if (firedRef.current) return;
    if (!task) return;
    if (progress < INFERENCE_TRIGGER) return;

    firedRef.current = true;

    // 拿不到原始文件（预设任务 / 刷新后内存清空）就没法推理，直接用种子随机结果
    if (!file) {
      setInferenceStatus("skipped");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setInferenceStatus("loading");

    runInference(file, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setLive(payload);
        setInferenceStatus("done");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 超时 / 后端未启动 / 返回体不合法 —— 一律降级到随机结果，不抛给页面
        console.warn("[detect] 模型推理失败，已降级为随机结果：", error);
        setInferenceStatus("failed");
      });
  }, [progress, task, file]);

  const phase = phaseOf(progress);
  const phaseIndex = PHASES.findIndex((item) => item.key === phase);
  // 进度到 100 但模型还没回 → 继续停在骨架屏，避免先闪一下假数据再跳变
  const waitingForInference = inferenceStatus === "loading";
  const isFinished = progress >= 100 && !!result && !waitingForInference;

  /**
   * 三态数据来源，直接对应界面徽章：
   *   model    —— 模型返回成功，界面用真实数值
   *   fallback —— 有音频但请求失败（超时 / 5xx / 返回体不合法），用随机结果兜底
   *   scenario —— 根本没有音频可推理（预设任务、刷新后 File 丢失），用种子随机
   */
  const source: ResultSource = live
    ? "model"
    : inferenceStatus === "failed"
      ? "fallback"
      : "scenario";

  return {
    progress,
    phase,
    phaseIndex: phaseIndex === -1 ? PHASES.length : phaseIndex,
    isFinished,
    started,
    metrics,
    live,
    inferenceStatus,
    source,
  };
}
