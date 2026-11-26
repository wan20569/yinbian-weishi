"use client";

import type { Task } from "@/lib/types";
import { buildOverview } from "@/lib/workbench-model";
import { cn } from "@/lib/utils";

/**
 * 数据概览：新设计稿里没有独立统计区，
 * 所以压缩成一行「标签 + 数字」嵌进「最近检测」的工具栏，
 * 数据来源与原四宫格完全一致。
 */
export function StatsOverview({ tasks, className }: { tasks: Task[]; className?: string }) {
  const overview = buildOverview(tasks);

  const stats = [
    { label: "累计检测", value: String(overview.total), unit: "首" },
    { label: "AI 命中", value: String(overview.aiHit), unit: "首" },
    { label: "平均相似度", value: overview.avgSimilarity, unit: "%" },
    { label: "匹配片段", value: String(overview.segments), unit: "处" },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-1", className)}>
      {stats.map((item) => (
        <span key={item.label} className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-muted-foreground">{item.label}</span>
          <span className="num text-[12px] font-medium text-foreground">{item.value}</span>
          <span className="text-[10px] text-muted-foreground/70">{item.unit}</span>
        </span>
      ))}
    </div>
  );
}
