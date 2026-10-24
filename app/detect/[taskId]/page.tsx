"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowUpRight, AudioLines, FileText, RadioTower } from "lucide-react";

import { AIProbabilityCard } from "@/components/detect/ai-probability-card";
import { AudioWaveform } from "@/components/detect/audio-waveform";
import { DetectionProgress } from "@/components/detect/detection-progress";
import { MatchedSegments } from "@/components/detect/matched-segments";
import { ReportButton } from "@/components/detect/report-button";
import { ResultPanel } from "@/components/detect/result-panel";
import { SimilarityCard } from "@/components/detect/similarity-card";
import { RiskBadge, StatusBadge } from "@/components/detect/status-badge";
import { DetectShell } from "@/components/layout/detect-shell";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetectionSimulation } from "@/hooks/use-detection-simulation";
import { mergeInferenceResult } from "@/lib/inference-merge";
import { detectTypeLabel } from "@/lib/mock-data";
import { buildTaskResult, resolveTask } from "@/lib/mock-service";
import { getStashedFile } from "@/lib/pending-files";
import type { DetectType, Task } from "@/lib/types";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";

/** 三态数据来源对应的徽章文案 */
const SOURCE_LABEL: Record<string, { text: string; hint: string }> = {
  model: { text: "模型实时判定", hint: "该结果由本地 CNN 模型实际推理得出" },
  fallback: { text: "模型推理失败 · 已降级随机", hint: "模型请求超时或出错，已回落到随机结果" },
  scenario: { text: "无原始音频 · 随机结果", hint: "没有可推理的音频（预设任务或刷新后文件已丢失）" },
};

function DetectResultContent() {
  const params = useParams<{ taskId: string }>();
  const searchParams = useSearchParams();
  const taskId = params.taskId;

  const task: Task = React.useMemo(() => {
    const found = resolveTask(taskId);
    const nameParam = searchParams.get("name");
    const typeParam = searchParams.get("type") as DetectType | null;
    return {
      ...found,
      fileName: nameParam ?? found.fileName,
      detectType: typeParam ?? found.detectType,
    };
  }, [taskId, searchParams]);

  const baseResult = React.useMemo(() => buildTaskResult(task), [task]);

  /**
   * 原始音频只在浏览器内存里（lib/pending-files.ts 按 taskId 暂存），
   * 所以必须在 effect 里读，保证服务端渲染阶段不会拿到 / 也不会用到它。
   * 为空时（预设任务、刷新后丢失、换了浏览器）跳过推理，直接用种子随机结果。
   */
  const [file, setFile] = React.useState<File | null>(null);
  React.useEffect(() => {
    setFile(getStashedFile(taskId));
  }, [taskId]);

  const { progress, phase, phaseIndex, isFinished, started, metrics, live, source } =
    useDetectionSimulation(task, baseResult, { file });

  // 真实推理优先；没有就回落到场景化随机，并保证数值与结论文案互相自洽
  const result = React.useMemo(
    () =>
      mergeInferenceResult(baseResult, live, metrics, {
        taskId: task.id,
        duration: baseResult.audioDuration,
      }),
    [baseResult, live, metrics, task.id]
  );

  return (
    <DetectShell
      maxWidth="max-w-[880px]"
      subtitle={`任务编号 ${task.id} · 结果由「AI 鉴别 + 指纹比对 + 旋律特征提取」三段链路综合判定`}
    >
      <div className="space-y-4">
        {/* 任务概览 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-primary">
              <AudioLines className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[15px] font-medium text-foreground">
                  {task.fileName}
                </h2>
                <StatusBadge status={isFinished ? "done" : task.status} />
                {isFinished ? <RiskBadge level={result.riskLevel} /> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{detectTypeLabel[task.detectType]}</span>
                <span>时长 {formatDuration(result.audioDuration)}</span>
                <span>提交于 {formatDateTime(new Date(task.createdAt))}</span>
                {isFinished ? (
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] leading-none",
                      source === "model"
                        ? "border-primary/30 bg-primary/[0.08] text-primary"
                        : "border-border text-muted-foreground/80"
                    )}
                    title={SOURCE_LABEL[source]?.hint}
                  >
                    {SOURCE_LABEL[source]?.text ?? source}
                  </span>
                ) : null}
              </div>
            </div>
            <Link href="/detect/new" className="group hidden shrink-0 sm:block">
              <Badge
                variant="outline"
                className="cursor-pointer gap-1 border-primary/25 bg-primary/[0.06] px-2.5 py-1 font-normal text-primary"
              >
                <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:scale-130" />
                再检测一首
              </Badge>
            </Link>
          </div>
        </div>

        {/* 波形 */}
        <AudioWaveform
          peaks={result.waveformData}
          duration={result.audioDuration}
          segments={isFinished ? result.matchedSegments : []}
        />

        {/* 检测进度 */}
        {!isFinished ? (
          <DetectionProgress
            progress={progress}
            phase={phase}
            phaseIndex={phaseIndex}
            started={started}
          />
        ) : null}

        {/* 结果区 */}
        {isFinished ? (
          <div className="space-y-4 animate-fade-up">
            <div className="grid gap-3 md:grid-cols-2">
              <AIProbabilityCard probability={result.aiProbability} animate />
              <SimilarityCard similarity={result.similarity} animate />
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  匹配片段
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {result.matchedSegments.length > 0
                    ? `${result.matchedSegments.length} 处命中 · 已在波形图高亮`
                    : "无显著命中"}
                </span>
              </div>
              <MatchedSegments segments={result.matchedSegments} />
            </div>

            <ResultPanel result={result} duration={result.audioDuration} animate />

            <Separator className="bg-border/70" />

            <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground">《AI 音乐鉴别技术意见书》</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  标准化报告含检测结论、证据链与片段定位，支持留存归档作为维权举证参考。
                </p>
              </div>
              <ReportButton task={task} result={result} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <RadioTower className="h-3.5 w-3.5 animate-pulse text-primary" />
              正在完成剩余链路，请稍候…
            </p>
          </div>
        )}
      </div>
    </DetectShell>
  );
}

export default function DetectResultPage() {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background text-[13px] text-muted-foreground">
          正在加载检测任务…
        </div>
      }
    >
      <DetectResultContent />
    </React.Suspense>
  );
}
