"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/detect/status-badge";
import { EmptyState } from "@/components/workbench/empty-state";
import { Card } from "@/components/ui/card";
import { detectTypeLabel } from "@/lib/mock-data";
import type { Task } from "@/lib/types";
import { cn, formatDateTime, formatDuration, formatFileSize } from "@/lib/utils";

export function ListView({
  tasks,
  selectedId,
  onSelect,
  searchTerm = "",
}: {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (task: Task) => void;
  /** 有搜索词时给「无匹配结果」，否则给「还没有任务」+ 上传引导 */
  searchTerm?: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState variant={searchTerm ? "search" : "no-task"} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_112px_92px_112px_128px_92px] gap-4 border-b border-border bg-secondary/30 px-5 py-2.5 text-[11px] text-muted-foreground">
        <span>文件</span>
        <span>检测类型</span>
        <span>时长</span>
        <span>大小</span>
        <span>提交时间</span>
        <span className="text-right">状态</span>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelect(task)}
            className={cn(
              "group grid w-full grid-cols-[minmax(0,1fr)_112px_92px_112px_128px_92px] items-center gap-4 px-5 py-3 text-left transition-colors",
              selectedId === task.id ? "bg-primary/[0.07]" : "hover:bg-secondary/40"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="origin-left truncate text-[12px] text-foreground transition-transform duration-200 group-hover:scale-110 group-active:scale-110">
                {task.fileName}
              </span>
              <Link
                href={`/detect/${task.id}`}
                onClick={(event) => event.stopPropagation()}
                className="group/link shrink-0 text-muted-foreground transition-colors hover:text-primary"
                aria-label="打开结果页"
              >
                <ExternalLink className="h-3 w-3 transition-transform duration-200 group-hover/link:scale-130" />
              </Link>
            </span>
            <span className="origin-left text-[11px] text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-active:scale-110">
              {detectTypeLabel[task.detectType]}
            </span>
            <span className="origin-left text-[11px] tabular-nums text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-active:scale-110">
              {task.duration > 0 ? formatDuration(task.duration) : "—"}
            </span>
            <span className="origin-left text-[11px] tabular-nums text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-active:scale-110">
              {formatFileSize(task.fileSize)}
            </span>
            <span className="origin-left text-[11px] tabular-nums text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-active:scale-110">
              {formatDateTime(new Date(task.createdAt))}
            </span>
            <span className="flex justify-end">
              <StatusBadge status={task.status} />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
