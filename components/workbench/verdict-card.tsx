"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, FileAudio, Loader2, ShieldCheck } from "lucide-react";

import { ConfidenceRing } from "@/components/workbench/confidence-ring";
import { buildSignals, summarizeVerdict } from "@/lib/workbench-model";
import { detectTypeLabel } from "@/lib/mock-data";
import type { Task } from "@/lib/types";
import { cn, formatDuration, formatFileSize } from "@/lib/utils";

export interface VerdictCardProps {
  task: Task | null;
  className?: string;
}

/**
 * 综合判定卡（设计稿的 Verdict 区）。
 * 数据全部来自 task.result，没有任何写死的示例值：
 * 换任务 → 结论、置信度、区间、耗时、标签同步变化。
 */
export function VerdictCard({ task, className }: VerdictCardProps) {
  const result = task?.status === "done" ? task.result : undefined;

  return (
    <section
      className={cn(
        "panel relative mt-6 overflow-hidden p-5 sm:p-7",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--glow-b) / calc(var(--glow-alpha) * 0.9))" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: "hsl(var(--glow-a) / calc(var(--glow-alpha) * 0.5))" }}
      />

      {!task ? (
        <div className="relative flex flex-col items-start gap-3 py-6">
          <span className="eyebrow">Model verdict · 综合判定</span>
          <p className="text-[20px] font-semibold tracking-tight text-foreground">还没有可判定的任务</p>
          <p className="max-w-[420px] text-[12px] leading-6 text-muted-foreground">
            上传一段音频后，这里会显示综合判定、置信度圆环与四类检测依据。
          </p>
          <Link
            href="/detect/new"
            className="grad-bg mt-1 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[hsl(var(--grad-ink))] transition hover:brightness-110"
          >
            <ShieldCheck className="h-4 w-4" />
            新建检测
          </Link>
        </div>
      ) : null}

      {task && !result ? (
        <div className="relative flex flex-col gap-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              {task.status === "failed" ? "检测失败" : task.status === "queued" ? "排队等待算力" : "分析进行中"}
            </span>
            <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[10px] text-muted-foreground">
              {task.id}
            </span>
          </div>

          <p className="truncate text-[22px] font-semibold tracking-tight text-foreground sm:text-[26px]">
            {task.fileName}
          </p>

          {task.status === "failed" ? (
            <p className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              音频文件损坏或格式不支持，无法提取特征。建议重新导出后再次上传。
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>正在提取频谱 / 相位 / 瞬态特征</span>
                <span className="num text-foreground">{Math.round(task.progress)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="grad-bar h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.max(4, task.progress)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {task && result ? <VerdictDetail task={task} /> : null}
    </section>
  );
}

function VerdictDetail({ task }: { task: Task }) {
  const result = task.result!;
  const verdict = summarizeVerdict(result);
  const signals = buildSignals(result);
  const riskLabel =
    result.riskLevel === "high" ? "高风险" : result.riskLevel === "medium" ? "中风险" : "低风险";

  return (
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
              verdict.isAi
                ? "border-[hsl(var(--warn)/0.28)] bg-[hsl(var(--warn)/0.1)] text-warn"
                : "border-primary/25 bg-primary/10 text-primary"
            )}
          >
            {verdict.isAi ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
            {verdict.highConfidence ? "高置信判定" : "参考判定"}
          </span>
          <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[10px] text-muted-foreground">
            {detectTypeLabel[task.detectType]} · {result.reportNo.slice(-8)}
          </span>
        </div>

        <p className="eyebrow mt-5">Model verdict · 综合判定</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="grad-text text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">
            {verdict.headline}
          </span>
          <span className="mb-1 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            {verdict.isAi ? "人类创作" : "AI 生成"}{" "}
            <span className="num text-foreground">{verdict.humanProbability.toFixed(1)}%</span>
          </span>
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          <FileAudio className="h-4 w-4 text-primary" />
          <span className="num text-foreground">{task.fileName}</span>
          <span className="text-border">·</span>
          <span className="num">{task.duration > 0 ? formatDuration(task.duration) : "—"}</span>
          <span className="text-border">·</span>
          <span>{detectTypeLabel[task.detectType]}</span>
          <span className="text-border">·</span>
          <span className="num">{formatFileSize(task.fileSize)}</span>
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--warn)/0.2)] bg-[hsl(var(--warn)/0.08)] px-2.5 py-1 text-[10px] text-warn">
            {riskLabel}
            <span className="num">{signals[0].score}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-2.5 py-1 text-[10px] text-muted-foreground">
            {signals[1].label}
            <span className="num">{signals[1].score}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-2.5 py-1 text-[10px] text-muted-foreground">
            {result.matchedSegments.length > 0
              ? `${result.matchedSegments.length} 处匹配片段`
              : "未检出匹配"}
          </span>
        </div>

        <Link
          href={`/detect/${task.id}`}
          className="group mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
        >
          查看完整技术意见书
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-130" />
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-5 border-t border-border/60 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <ConfidenceRing value={verdict.confidence} />
        <dl className="space-y-2.5 text-[11px]">
          <div>
            <dt className="text-muted-foreground">AI 概率</dt>
            <dd className="num mt-0.5 text-[13px] text-foreground">
              {verdict.aiProbability.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">置信区间</dt>
            <dd className="num mt-0.5 text-[13px] text-foreground">
              {verdict.interval[0].toFixed(1)}–{verdict.interval[1].toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">分析耗时</dt>
            <dd className="num mt-0.5 text-[13px] text-foreground">{verdict.elapsed}s</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
