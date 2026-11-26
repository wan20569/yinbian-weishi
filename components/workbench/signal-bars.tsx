"use client";

import type { SignalItem } from "@/lib/workbench-model";
import type { DetectionResult } from "@/lib/types";

const BAR_GRADIENTS = [
  "linear-gradient(90deg, hsl(var(--grad-from)), hsl(var(--grad-via)))",
  "linear-gradient(90deg, hsl(var(--grad-via)), hsl(var(--grad-to)))",
  "linear-gradient(90deg, hsl(var(--grad-to)), hsl(var(--grad-from)))",
  "linear-gradient(90deg, hsl(var(--muted-foreground)), hsl(var(--grad-from)))",
];

export interface SignalBarsProps {
  signals: SignalItem[];
  result: DetectionResult;
  elapsed: number;
}

/** 检测依据：四类证据交叉验证 + 模型元信息 */
export function SignalBars({ signals, result, elapsed }: SignalBarsProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">检测依据</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">四类证据交叉验证 · 12 项指标</p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {result.matchedSegments.length > 0 ? "片段级定位" : "无片段命中"}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {signals.map((signal, index) => (
          <div key={signal.key}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-foreground/80">{signal.label}</span>
              <span className="num text-muted-foreground">{signal.score}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${signal.score}%`,
                  backgroundImage: BAR_GRADIENTS[index % BAR_GRADIENTS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">检测模型</span>
          <span className="num text-foreground/80">v2.4.1 集成</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">采样窗口</span>
          <span className="num text-foreground/80">30s · 48 kHz</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">平均耗时</span>
          <span className="num text-foreground/80">{elapsed}s</span>
        </div>
      </div>
    </section>
  );
}
