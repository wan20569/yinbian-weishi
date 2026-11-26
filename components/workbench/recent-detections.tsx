"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileAudio, LayoutGrid, List } from "lucide-react";

import { StatusBadge } from "@/components/detect/status-badge";
import { EmptyState } from "@/components/workbench/empty-state";
import { TaskList } from "@/components/workbench/task-list";
import type { Task } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export interface RecentDetectionsProps {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (task: Task) => void;
  /** 筛选胶囊 + 统计条，由页面注入 */
  toolbar?: ReactNode;
  searchTerm?: string;
}

/** 最近检测：行点击 = 选中任务（联动右侧详情），箭头 = 直接进结果页 */
export function RecentDetections({
  tasks,
  selectedId,
  onSelect,
  toolbar,
  searchTerm,
}: RecentDetectionsProps) {
  /**
   * 默认表格（贴合设计稿）；切到卡片视图时复用原来的 TaskCard，
   * 那张卡片的整卡 hover 缩放 + 徽章不溢出方案就此保留下来。
   */
  const [layout, setLayout] = React.useState<"table" | "cards">("table");

  return (
    <section className="panel mt-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">最近检测</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            本机记录 · {layout === "table" ? "点击任意一行查看详情" : "点击卡片联动右侧详情"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-lg border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => setLayout("table")}
              aria-pressed={layout === "table"}
              aria-label="表格视图"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                layout === "table"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("cards")}
              aria-pressed={layout === "cards"}
              aria-label="卡片视图"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                layout === "cards"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          <Link
            href="/?view=list"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            全部记录
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-2.5">
          {toolbar}
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState variant={searchTerm ? "search" : "no-task"} compact />
        </div>
      ) : layout === "cards" ? (
        <div className="p-4">
          <TaskList
            tasks={tasks}
            selectedId={selectedId}
            onSelect={onSelect}
            searchTerm={searchTerm}
          />
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {tasks.map((task) => {
            const result = task.status === "done" ? task.result : undefined;
            const isSelected = selectedId === task.id;

            return (
              <div
                key={task.id}
                className={cn(
                  "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors sm:grid-cols-[minmax(0,1fr)_70px_84px_150px]",
                  isSelected ? "bg-primary/[0.06]" : "hover:bg-secondary/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(task)}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span className="num truncate text-[12px] text-foreground">{task.fileName}</span>
                </button>

                <span className="num hidden text-[11px] text-muted-foreground sm:block">
                  {task.duration > 0 ? formatDuration(task.duration) : "—"}
                </span>

                <span className="num hidden text-[11px] text-foreground/80 sm:block">
                  {result ? `${result.aiProbability.toFixed(1)}%` : "—"}
                </span>

                <div className="flex items-center justify-end gap-2">
                  {result ? (
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[9px]",
                        result.aiProbability >= 70
                          ? "border-[hsl(var(--warn)/0.22)] bg-[hsl(var(--warn)/0.09)] text-warn"
                          : result.aiProbability >= 40
                            ? "border-border bg-secondary/50 text-foreground/70"
                            : "border-primary/22 bg-primary/10 text-primary"
                      )}
                    >
                      {result.aiProbability >= 70
                        ? "高置信 AI"
                        : result.aiProbability >= 40
                          ? "疑似 AI"
                          : "倾向人类"}
                    </span>
                  ) : (
                    <StatusBadge status={task.status} />
                  )}

                  <Link
                    href={`/detect/${task.id}`}
                    aria-label={`打开 ${task.fileName} 的结果页`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:scale-130" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
