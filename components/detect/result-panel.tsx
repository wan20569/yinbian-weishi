"use client";

import { CheckCircle2, Quote } from "lucide-react";

import { riskMeta, StatusBadge } from "@/components/detect/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DetectionResult } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function ResultPanel({
  result,
  animate = false,
  duration,
}: {
  result: DetectionResult;
  animate?: boolean;
  duration: number;
}) {
  const risk = riskMeta[result.riskLevel];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-foreground">检测结论</span>
          <Badge
            variant={
              result.riskLevel === "high"
                ? "destructive"
                : result.riskLevel === "medium"
                  ? "warning"
                  : "success"
            }
          >
            {risk.label}
          </Badge>
        </div>
        <div className="mt-3 flex items-start gap-2.5">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[12px] leading-6 text-muted-foreground">
            {animate ? typingText(result.verdict, duration) : result.verdict}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[12px] font-medium text-foreground">多维度证据链</p>
        <ul className="mt-3 space-y-2.5">
          {result.evidenceChain.map((item) => (
            <li key={item.key} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-foreground">{item.name}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {item.score.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">{item.method}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {item.conclusion}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <Separator className="my-3.5" />

        <dl className="grid grid-cols-2 gap-2.5 text-[11px]">
          <div>
            <dt className="text-muted-foreground">音频时长</dt>
            <dd className="mt-0.5 tabular-nums text-foreground">{formatDuration(duration)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">报告编号</dt>
            <dd className="mt-0.5 tabular-nums text-foreground">{result.reportNo}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** 结论文案，避免出现 undefined */
function typingText(text: string, duration: number) {
  const extra = duration > 0 ? "" : "";
  return `${text}${extra}`;
}

export { StatusBadge };
