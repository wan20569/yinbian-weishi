"use client";

import { Check, Loader2 } from "lucide-react";

import { PHASES, type DetectionPhase } from "@/hooks/use-detection-simulation";
import { cn } from "@/lib/utils";

export interface DetectionProgressProps {
  progress: number;
  phase: DetectionPhase;
  phaseIndex: number;
  started: boolean;
  className?: string;
}

export function DetectionProgress({
  progress,
  phase,
  phaseIndex,
  started,
  className,
}: DetectionProgressProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          {phase === "finished" ? "检测完成" : "检测进行中"}
        </span>
        <span className="text-[12px] tabular-nums text-primary">{Math.round(progress)}%</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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
