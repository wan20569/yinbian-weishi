"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, AudioLines, FileText, RadioTower } from "lucide-react";

import { AIProbabilityCard } from "@/components/detect/ai-probability-card";
import { AudioWaveform } from "@/components/detect/audio-waveform";
import { DemoResetButton } from "@/components/detect/demo-reset-button";
import { DemoScriptCardView } from "@/components/detect/demo-script-card";
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
import { toast } from "@/components/ui/use-toast";
import { useDetectionSimulation } from "@/hooks/use-detection-simulation";
import {
  getDemoCard,
  getDemoScenario,
  getDetectCount,
  resetDetectCount,
} from "@/lib/demo-script";
import { detectTypeLabel, mockTasks } from "@/lib/mock-data";
import { buildTaskResult, resolveTask } from "@/lib/mock-service";
import type { DetectType, Task } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";

function DetectResultContent() {
  const params = useParams<{ taskId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  /**
   * 演示计数：优先取 URL 上的 dc（上传页跳转时带上，刷新结果页不会丢）。
   * 没有 dc 时，只有「非预设任务」才回落到 localStorage 计数 ——
   * 否则点开任意一条预设任务都会被演示脚本带偏。
   */
  const isPresetTask = React.useMemo(
    () => mockTasks.some((item) => item.id === taskId),
    [taskId]
  );
  const dcFromUrl = Number.parseInt(searchParams.get("dc") ?? "", 10);
  const [fallbackCount, setFallbackCount] = React.useState(0);
  React.useEffect(() => {
    if (Number.isFinite(dcFromUrl)) return;
    setFallbackCount(getDetectCount());
  }, [dcFromUrl]);

  const demoCount =
    Number.isFinite(dcFromUrl) && dcFromUrl > 0
      ? dcFromUrl
      : isPresetTask
        ? 0
        : fallbackCount;

  // 演示脚本：第 1/2 次钉死场景，第 3 次起返回 null 走种子随机
  const forceScenario = demoCount > 0 ? getDemoScenario(demoCount) : null;
  const demoCard = demoCount > 0 ? getDemoCard(demoCount) : null;

  /** ?reset=1 -> 重置计数后用 replace 抹掉参数，避免刷新又重置一次 */
  React.useEffect(() => {
    if (searchParams.get("reset") !== "1") return;
    resetDetectCount();
    setFallbackCount(0);
    toast({
      title: "演示计数已重置",
      description: "下一次上传将重新从第 1 次（原创作品）开始演示",
      variant: "success",
    });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("reset");
    const query = next.toString();
    router.replace(query ? `/detect/${taskId}?${query}` : `/detect/${taskId}`);
  }, [searchParams, router, taskId]);

  const baseResult = React.useMemo(
    () => buildTaskResult(task, forceScenario),
    [task, forceScenario]
  );
  const { progress, phase, phaseIndex, isFinished, started, metrics } = useDetectionSimulation(
    task,
    baseResult,
    forceScenario
  );

  // 用当次场景化随机结果覆盖三个核心指标，保证「看到什么就存什么」
  const result = React.useMemo(() => {
    if (!metrics) return baseResult;
    return {
      ...baseResult,
      aiProbability: metrics.aiProbability,
      similarity: metrics.similarity,
      matchedSegments: metrics.matchedSegments,
      riskLevel: metrics.riskLevel,
    };
  }, [baseResult, metrics]);

  return (
    <DetectShell
      maxWidth="max-w-[880px]"
      subtitle={`任务编号 ${task.id} · 结果由「AI 鉴别 + 指纹比对 + 旋律特征提取」三段链路综合判定`}
      footerExtra={<DemoResetButton />}
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
              </div>
            </div>
            <Link href="/detect/new" className="hidden shrink-0 sm:block">
              <Badge
                variant="outline"
                className="cursor-pointer gap-1 border-primary/25 bg-primary/[0.06] px-2.5 py-1 font-normal text-primary"
              >
                <ArrowUpRight className="h-3 w-3" />
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
            {demoCard ? (
              <DemoScriptCardView card={demoCard} segments={result.matchedSegments} />
            ) : null}

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
