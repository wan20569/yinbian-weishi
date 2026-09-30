"use client";

import Link from "next/link";
import { AlertTriangle, AudioLines, FileText, Info, Loader2 } from "lucide-react";

import { AIProbabilityCard } from "@/components/detect/ai-probability-card";
import { ComplianceNotice } from "@/components/detect/compliance-notice";
import { AudioWaveform } from "@/components/detect/audio-waveform";
import { MatchedSegments } from "@/components/detect/matched-segments";
import { ReportButton } from "@/components/detect/report-button";
import { ResultPanel } from "@/components/detect/result-panel";
import { SimilarityCard } from "@/components/detect/similarity-card";
import { StatusBadge } from "@/components/detect/status-badge";
import { EmptyState } from "@/components/workbench/empty-state";
import { Progress } from "@/components/ui/progress";
import { detectTypeLabel } from "@/lib/mock-data";
import type { Task } from "@/lib/types";
import { formatDateTime, formatDuration, formatFileSize } from "@/lib/utils";

export function DetailPanel({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-[#0D1219]">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <span className="text-[13px] font-medium text-foreground">任务详情</span>
        </div>
        <div className="flex-1 overflow-y-auto thin-scrollbar p-5">
          <EmptyState variant="no-result" compact />
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-[12px] font-medium text-foreground">
              <Info className="h-3.5 w-3.5 text-primary" />
              检测能力说明
            </p>
            <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-muted-foreground">
              <li>· AI 鉴别：轻量 CNN 模型判别是否由 AI 生成</li>
              <li>· 抄袭检测：音频指纹 + 旋律特征，定位相似片段</li>
              <li>· 综合检测：全链路输出标准化技术意见书</li>
            </ul>
          </div>
        </div>
      </aside>
    );
  }

  const result = task.result;

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-[#0D1219]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
        <span className="text-[13px] font-medium text-foreground">任务详情</span>
        <StatusBadge status={task.status} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto thin-scrollbar p-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
              <AudioLines className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{task.fileName}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {detectTypeLabel[task.detectType]} · {formatFileSize(task.fileSize)} ·{" "}
                {task.duration > 0 ? formatDuration(task.duration) : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            提交于 {formatDateTime(new Date(task.createdAt))}
          </p>
        </div>

        {task.status === "analyzing" || task.status === "queued" ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {task.status === "queued" ? "排队等待算力" : "检测进行中"}
            </div>
            <Progress value={task.progress} className="mt-3" />
            <p className="mt-2 text-right text-[11px] tabular-nums text-primary">
              {Math.round(task.progress)}%
            </p>
            <Link href={`/detect/${task.id}`} className="mt-4 block">
              <span className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
                打开完整检测流水线 →
              </span>
            </Link>
          </div>
        ) : null}

        {task.status === "failed" ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              检测失败
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              音频文件损坏或格式不支持，无法完成特征提取。建议重新导出后再次上传。
            </p>
          </div>
        ) : null}

        {task.status === "done" && result ? (
          <>
            <AudioWaveform
              peaks={result.waveformData}
              duration={result.audioDuration}
              segments={result.matchedSegments}
              height={96}
              controls={false}
            />
            <AIProbabilityCard probability={result.aiProbability} />
            <SimilarityCard similarity={result.similarity} />
            <div>
              <p className="mb-2 text-[12px] font-medium text-foreground">匹配片段</p>
              <MatchedSegments segments={result.matchedSegments} />
            </div>
            <ResultPanel result={result} duration={result.audioDuration} />
            <div className="flex flex-col gap-2">
              <ReportButton task={task} result={result} variant="ghost" />
              <Link href={`/detect/${task.id}`}>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  查看完整结果页
                </span>
              </Link>
            </div>
            <ComplianceNotice text="本报告仅为技术参考，不等同司法鉴定意见。" />
          </>
        ) : null}
      </div>
    </aside>
  );
}
