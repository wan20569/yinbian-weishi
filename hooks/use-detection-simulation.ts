"use client";

import * as React from "react";

import { generateRandomResult, type RandomResult } from "@/lib/random-result";
import type { DetectionResult, Task } from "@/lib/types";

export type DetectionPhase = "parsing" | "cnn" | "fingerprint" | "melody" | "finished";

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

function phaseOf(progress: number): DetectionPhase {
  if (progress >= 100) return "finished";
  const hit = THRESHOLDS.find((item) => progress < item.until);
  return hit ? hit.phase : "melody";
}

/**
 * 模拟检测流水线：解析 -> AI 鉴别 -> 指纹比对 -> 旋律特征提取 -> 完成
 * 总时长约 4.5s
 */
export function useDetectionSimulation(task: Task | null, result: DetectionResult | null) {
  const [progress, setProgress] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  // 场景化随机结果：初始 null，保证 SSR 首屏不出现随机值（避免 hydration 不一致）
  const [metrics, setMetrics] = React.useState<RandomResult | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  React.useEffect(() => {
    if (!task) return;
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
  }, [task, stop]);

  const phase = phaseOf(progress);
  const phaseIndex = PHASES.findIndex((item) => item.key === phase);
  const isFinished = progress >= 100 && !!result;

  return {
    progress,
    phase,
    phaseIndex: phaseIndex === -1 ? PHASES.length : phaseIndex,
    isFinished,
    started,
    metrics,
  };
}
