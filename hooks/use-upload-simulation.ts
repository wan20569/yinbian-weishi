"use client";

import * as React from "react";

import { clamp } from "@/lib/utils";

export type UploadStage = "idle" | "uploading" | "finishing" | "done";

export interface SelectedFile {
  name: string;
  size: number;
  /** 原始文件对象，跨路由传给推理接口用（只存浏览器内存，不序列化） */
  file: File;
}

export function useUploadSimulation() {
  const [file, setFile] = React.useState<SelectedFile | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [stage, setStage] = React.useState<UploadStage>("idle");

  const timerRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
  }, []);

  React.useEffect(() => clearTimers, [clearTimers]);

  const reset = React.useCallback(() => {
    clearTimers();
    setProgress(0);
    setStage("idle");
    setFile(null);
  }, [clearTimers]);

  /** 开始模拟上传；完成后回调用于跳转 */
  const start = React.useCallback(
    (selected: SelectedFile, onFinished: (file: SelectedFile) => void) => {
      clearTimers();
      setFile(selected);
      setProgress(0);
      setStage("uploading");

      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          const step = 4 + Math.random() * 7;
          const next = clamp(prev + step, 0, 100);
          if (next >= 100) {
            clearTimers();
            setStage("finishing");
            timeoutRef.current = window.setTimeout(() => {
              setStage("done");
              onFinished(selected);
            }, 520);
          }
          return next;
        });
      }, 130);
    },
    [clearTimers]
  );

  const cancel = React.useCallback(() => {
    clearTimers();
    setProgress(0);
    setStage("idle");
    setFile(null);
  }, [clearTimers]);

  return { file, progress, stage, start, cancel, reset };
}
