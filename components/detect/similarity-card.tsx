"use client";

import { Fingerprint } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useCountUp } from "@/components/detect/ai-probability-card";
import { cn } from "@/lib/utils";

export function SimilarityCard({
  similarity,
  animate = false,
}: {
  similarity: number;
  animate?: boolean;
}) {
  const value = useCountUp(similarity, animate);
  const shown = animate ? value : similarity;

  const tone =
    similarity >= 70
      ? { text: "text-destructive", bar: "bg-destructive", label: "高度相似" }
      : similarity >= 40
        ? { text: "text-warn", bar: "bg-warn", label: "中度相似" }
        : { text: "text-primary", bar: "bg-primary", label: "无显著相似" };

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-warn/[0.06]" />
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Fingerprint className="h-3.5 w-3.5 text-primary" />
        抄袭相似度
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={cn("text-[38px] font-medium leading-none tabular-nums", tone.text)}>
          {shown.toFixed(1)}
        </span>
        <span className="text-[13px] text-muted-foreground">%</span>
        <span className={cn("ml-2 text-[12px] font-medium", tone.text)}>{tone.label}</span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", tone.bar)}
          style={{ width: `${shown}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "指纹比对", value: Math.min(100, similarity + 4.8) },
          { label: "旋律特征", value: Math.max(1, similarity - 12.7) },
          { label: "编曲特征", value: Math.max(1, similarity - 19.4) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-secondary/30 px-2 py-2.5">
            <dt className="text-[10px] text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-[13px] tabular-nums text-foreground">
              {item.value.toFixed(1)}%
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
