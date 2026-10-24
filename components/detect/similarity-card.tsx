"use client";

import { Fingerprint } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useCountUp } from "@/components/detect/ai-probability-card";
import { cn } from "@/lib/utils";

export function SimilarityCard({
  similarity,
  animate = false,
  available = true,
}: {
  similarity: number;
  animate?: boolean;
  /** false 表示后端没有做声纹比对，此时不显示数字，避免把「没测」误读成「不相似」 */
  available?: boolean;
}) {
  const value = useCountUp(available ? similarity : 0, animate && available);
  const shown = animate ? value : similarity;

  if (!available) {
    return (
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-warn/[0.06]" />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Fingerprint className="h-3.5 w-3.5 text-primary" />
          抄袭相似度
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-[38px] font-medium leading-none text-muted-foreground">—</span>
          <span className="ml-2 text-[12px] font-medium text-muted-foreground">未进行声纹比对</span>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
          当前模型仅输出 AI 生成概率，未接入音频指纹库，因此不产生相似度与命中片段。
        </p>
      </Card>
    );
  }

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

      <p className="mt-4 text-[10px] leading-4 text-muted-foreground/80">
        整体相似度由后端指纹比对接口返回，前端不做二次加工。
      </p>
    </Card>
  );
}
