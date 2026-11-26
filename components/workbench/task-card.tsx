"use client";

import { AudioLines } from "lucide-react";

import { StatusBadge } from "@/components/detect/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/types";
import { detectTypeLabel } from "@/lib/mock-data";
import { cn, formatDuration, formatFileSize, formatRelativeTime } from "@/lib/utils";

export interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onSelect: (task: Task) => void;
}

export function TaskCard({ task, selected = false, onSelect }: TaskCardProps) {
  const failed = task.status === "failed";
  const running = task.status === "analyzing" || task.status === "queued";

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={cn(
        // 缩放放在最外层：整卡等比放大，内部元素（含状态徽章）相对位置不变，
        // 因此「已完成 / 检测中」永远不会被推出卡片边界。
        "group relative w-full rounded-2xl border p-4 text-left backdrop-blur-xl transition-all duration-200",
        "bg-card/55 hover:z-10 hover:scale-[1.02]",
        selected
          ? "border-primary/55 bg-primary/[0.05] ring-1 ring-primary/25"
          : "border-border/70 hover:border-primary/40 hover:bg-card/70"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
            failed
              ? "border-destructive/25 bg-destructive/10 text-destructive"
              : "border-border bg-secondary text-primary"
          )}
        >
          <AudioLines className="h-4 w-4 transition-transform duration-200 group-hover:scale-130" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-medium text-foreground">{task.fileName}</p>
            <StatusBadge status={task.status} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>{detectTypeLabel[task.detectType]}</span>
            <span className="text-border">·</span>
            <span>{task.duration > 0 ? formatDuration(task.duration) : "—"}</span>
            <span className="text-border">·</span>
            <span>{formatFileSize(task.fileSize)}</span>
            <span className="text-border">·</span>
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
        </div>
      </div>

      {running ? (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{task.status === "queued" ? "等待分配算力" : "检测进行中"}</span>
            <span>{Math.round(task.progress)}%</span>
          </div>
          <Progress value={task.progress} />
        </div>
      ) : null}

      {failed ? (
        <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-2.5 py-2 text-[11px] leading-5 text-destructive">
          检测未完成，未获得有效结果。可重新上传后再试。
        </p>
      ) : null}

      {task.status === "done" && task.result ? (
        <div className="mt-3.5 flex items-center gap-2">
          <Badge
            variant={
              task.result.aiProbability >= 70
                ? "destructive"
                : task.result.aiProbability >= 40
                  ? "warning"
                  : "success"
            }
          >
            AI {task.result.aiProbability.toFixed(1)}%
          </Badge>
          <Badge
            variant={
              task.result.similarity >= 70
                ? "destructive"
                : task.result.similarity >= 40
                  ? "warning"
                  : "secondary"
            }
          >
            相似度 {task.result.similarity.toFixed(1)}%
          </Badge>
          {task.result.matchedSegments.length > 0 ? (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {task.result.matchedSegments.length} 处匹配片段
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-primary">未检出匹配</span>
          )}
        </div>
      ) : null}
    </button>
  );
}
