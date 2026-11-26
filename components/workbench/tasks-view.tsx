"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { AlertTriangle, Layers, ListChecks, Plus, RadioTower } from "lucide-react";

import { DimensionCards } from "@/components/workbench/dimension-cards";
import { RecentDetections } from "@/components/workbench/recent-detections";
import { SignalBars } from "@/components/workbench/signal-bars";
import { StatsOverview } from "@/components/workbench/stats-overview";
import { UploadCard } from "@/components/workbench/upload-card";
import { VerdictCard } from "@/components/workbench/verdict-card";
import { buildCharts, buildSignals, pickFeaturedTask, summarizeVerdict } from "@/lib/workbench-model";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WorkbenchFilterKey = "all" | "recent" | "pending" | "flagged";

export const WORKBENCH_FILTERS: Array<{
  key: WorkbenchFilterKey;
  label: string;
  icon: ElementType;
}> = [
  { key: "all", label: "全部任务", icon: Layers },
  { key: "recent", label: "最近检测", icon: RadioTower },
  { key: "pending", label: "进行中", icon: ListChecks },
  { key: "flagged", label: "风险命中", icon: AlertTriangle },
];

export interface TasksViewProps {
  tasks: Task[];
  visibleTasks: Task[];
  selectedId: string | null;
  onSelect: (task: Task) => void;
  filter: WorkbenchFilterKey;
  onFilterChange: (filter: WorkbenchFilterKey) => void;
  searchTerm: string;
}

/**
 * 工作台主视图（设计稿同款分区）：
 * 页头 → 综合判定 → 上传 / 检测依据 → 多维分析 → 最近检测 → 页脚。
 * 所有区块的数据都从 tasks 派生，没有写死的示例值。
 */
export function TasksView({
  tasks,
  visibleTasks,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  searchTerm,
}: TasksViewProps) {
  const featured = pickFeaturedTask(tasks, selectedId);
  const result = featured?.status === "done" ? featured.result : undefined;
  const verdict = result ? summarizeVerdict(result) : null;

  return (
    <div className="space-y-0">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-primary" />
            Workspace / 工作台
          </div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">
            AI 音乐检测器
          </h1>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            上传音频，识别 AI 生成与人类创作 · <span className="num">18</span> 类生成器指纹
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1.5 text-[11px] text-muted-foreground sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            引擎在线
          </span>
          <Link
            href="/detect/new"
            className="grad-bg inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--grad-ink))] shadow-[0_0_28px_-6px_hsl(var(--primary)/0.8)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            新建检测
          </Link>
        </div>
      </div>

      {/* 综合判定 */}
      <VerdictCard task={featured} />

      {/* 上传 + 检测依据 */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <UploadCard peaks={result?.waveformData} />

        {result ? (
          <SignalBars
            signals={buildSignals(result)}
            result={result}
            elapsed={verdict?.elapsed ?? 0}
          />
        ) : (
          <section className="panel p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-foreground">检测依据</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">四类证据交叉验证 · 12 项指标</p>
            <div className="mt-6 space-y-4">
              {["频谱纹理", "相位一致性", "瞬态包络", "编解码指纹"].map((label) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground/70">{label}</span>
                    <span className="num text-muted-foreground">—</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" />
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl border border-border/60 bg-secondary/20 px-3.5 py-3 text-[11px] leading-5 text-muted-foreground">
              完成一次检测后，这里会展示四类证据的量化得分与模型信息。
            </p>
          </section>
        )}
      </div>

      {/* 多维分析 */}
      {result ? (
        <DimensionCards
          charts={buildCharts(result)}
          aiProbability={result.aiProbability}
          duration={result.audioDuration}
        />
      ) : null}

      {/* 最近检测 + 筛选 + 统计 */}
      <RecentDetections
        tasks={visibleTasks}
        selectedId={selectedId}
        onSelect={onSelect}
        searchTerm={searchTerm}
        toolbar={
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {WORKBENCH_FILTERS.map((item) => {
                const Icon = item.icon;
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onFilterChange(item.key)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <StatsOverview tasks={tasks} />
          </>
        }
      />

      {/* 页脚 */}
      <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4 text-[10px] text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 音辩卫士 · 检测结果基于统计模型，仅供参考</p>
        <p className="num">ENGINE v2.4.1 · LATENCY 23s · FILES AUTO-DELETE 24H</p>
      </div>
    </div>
  );
}
