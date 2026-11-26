"use client";

import { Check, Loader2 } from "lucide-react";

import { PHASES, type DetectionPhase } from "@/hooks/use-detection-simulation";
import { cn } from "@/lib/utils";

export interface DetectionProgressProps {
  progress: number;
  phase: DetectionPhase;
  phaseIndex: number;
  started: boolean;
  /**
   * 本地链路已跑完、只等模型返回。
   * 公网环境下这一步可能要十几秒到几十秒，必须给用户一个「在等什么」的说法，
   * 否则看起来就是页面卡死。
   */
  waiting?: boolean;
  className?: string;
}

export function DetectionProgress({
  progress,
  phase,
  phaseIndex,
  started,
  waiting = false,
  className,
}: DetectionProgressProps) {
  const title = waiting ? "等待模型返回" : phase === "finished" ? "检测完成" : "检测进行中";

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <span className="text-[12px] tabular-nums text-primary">{Math.round(progress)}%</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-200 ease-out",
            waiting && "animate-pulse"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {waiting ? (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-primary" />
          本地解析已完成，正在等待推理服务返回结果。公网链路通常需要 10~30 秒，请不要关闭页面。
        </p>
      ) : null}

      <ol className="mt-5 grid gap-3 sm:grid-cols-4">
        {PHASES.map((item, index) => {
          const isDone = phaseIndex > index || phase === "finished";
          const isActive = !isDone && started && phaseIndex === index;
          return (
            <li
              key={item.key}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isDone
                  ? "border-primary/25 bg-primary/[0.06]"
                  : isActive
                    ? "border-primary/45 bg-primary/[0.10]"
                    : "border-border bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full text-[9px] font-medium",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {isDone ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-[12px]",
                    isDone || isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </span>
              </div>
              <p className="mt-1.5 pl-6 text-[10px] leading-4 text-muted-foreground/80">
                {item.hint}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
