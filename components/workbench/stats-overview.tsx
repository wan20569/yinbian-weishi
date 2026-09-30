"use client";

import { AudioLines, Fingerprint, ShieldCheck, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatsOverview({ tasks }: { tasks: Task[] }) {
  const doneTasks = tasks.filter((task) => task.status === "done" && task.result);
  const aiHit = doneTasks.filter((task) => (task.result?.aiProbability ?? 0) >= 70).length;
  const avgSimilarity = doneTasks.length
    ? doneTasks.reduce((sum, task) => sum + (task.result?.similarity ?? 0), 0) / doneTasks.length
    : 0;
  const matched = doneTasks.reduce(
    (sum, task) => sum + (task.result?.matchedSegments.length ?? 0),
    0
  );

  const stats = [
    {
      label: "累计检测",
      value: String(tasks.length),
      unit: "首",
      hint: "本周 +12",
      icon: AudioLines,
      tone: "text-primary",
    },
    {
      label: "AI 生成命中",
      value: String(aiHit),
      unit: "首",
      hint: `命中率 ${doneTasks.length ? Math.round((aiHit / doneTasks.length) * 100) : 0}%`,
      icon: TrendingUp,
      tone: "text-destructive",
    },
    {
      label: "平均相似度",
      value: avgSimilarity.toFixed(1),
      unit: "%",
      hint: "全部已完成检测",
      icon: Fingerprint,
      tone: "text-warn",
    },
    {
      label: "匹配片段",
      value: String(matched),
      unit: "处",
      hint: "片段级定位",
      icon: ShieldCheck,
      tone: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              <Icon className={cn("h-3.5 w-3.5", item.tone)} />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="text-[22px] font-medium leading-none tracking-tight text-foreground">
                {item.value}
              </span>
              <span className="text-[11px] text-muted-foreground">{item.unit}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/80">{item.hint}</p>
          </Card>
        );
      })}
    </div>
  );
}
