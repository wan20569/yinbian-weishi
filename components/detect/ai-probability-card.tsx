"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 数字滚动动画 */
export function useCountUp(target: number, active: boolean, duration = 800) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

export function AIProbabilityCard({
  probability,
  animate = false,
}: {
  probability: number;
  animate?: boolean;
}) {
  const value = useCountUp(probability, animate);
  const shown = animate ? value : probability;

  const tone =
    probability >= 70
      ? { text: "text-destructive", ring: "stroke-destructive", label: "高度疑似 AI 生成" }
      : probability >= 40
        ? { text: "text-warn", ring: "stroke-warn", label: "疑似 AI 辅助生成" }
        : { text: "text-primary", ring: "stroke-primary", label: "未检出 AI 特征" };

  const circumference = 2 * Math.PI * 52;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-destructive/[0.06]" />
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        AI 生成概率
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-[124px] w-[124px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#1E2530"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              className={tone.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - shown / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn("text-[26px] font-medium leading-none tabular-nums", tone.text)}
            >
              {shown.toFixed(1)}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">%</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("text-[13px] font-medium", tone.text)}>{tone.label}</span>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            基于轻量 CNN 判别模型对梅尔频谱声学特征推理得出，置信区间 ±2.4%。
          </p>
          <div className={cn("space-y-1.5 pt-1", tone.text)}>
            {[
              { label: "声码器伪影", value: Math.min(99, probability + 3.2) },
              { label: "人声自然度", value: Math.max(2, 100 - probability - 1.1) },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{row.label}</span>
                  <span className="tabular-nums">{row.value.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-current opacity-80"
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
