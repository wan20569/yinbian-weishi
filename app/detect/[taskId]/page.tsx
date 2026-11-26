"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowUpRight, AudioLines, FileText, RadioTower, RefreshCw, TriangleAlert } from "lucide-react";

import { AIProbabilityCard } from "@/components/detect/ai-probability-card";
import { AudioWaveform } from "@/components/detect/audio-waveform";
import { DetectionProgress } from "@/components/detect/detection-progress";
import { MatchedSegments } from "@/components/detect/matched-segments";
import { ReportButton } from "@/components/detect/report-button";
import { ResultPanel } from "@/components/detect/result-panel";
import { SimilarityCard } from "@/components/detect/similarity-card";
import { WindowTimeline } from "@/components/detect/window-timeline";
import { RiskBadge, StatusBadge } from "@/components/detect/status-badge";
import { AuthGate } from "@/components/auth/auth-gate";
import { DetectShell } from "@/components/layout/detect-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetectionSimulation } from "@/hooks/use-detection-simulation";
import { mergeInferenceResult } from "@/lib/inference-merge";
import { detectTypeLabel } from "@/lib/mock-data";
import { buildTaskResult, resolveTask, updateTaskResult } from "@/lib/mock-service";
import { getStashedFile } from "@/lib/pending-files";
import type { DetectType, Task } from "@/lib/types";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";

/** 数据来源对应的徽章文案 */
const SOURCE_LABEL: Record<string, { text: string; hint: string }> = {
  model: { text: "模型实时判定", hint: "该结果由本地 CNN 模型实际推理得出" },
  failed: {
    text: "检测失败",
    hint: "模型请求失败、超时或返回异常，本次未产出有效检测结论",
  },
  noFile: { text: "无原始音频", hint: "没有可推理的音频（刷新后文件已丢失，请重新上传）" },
};

/** 失败原因 → 用户可读文案 */
const FAILURE_REASON_LABEL: Record<string, string> = {
  "no-file": "没有可推理的原始音频（刷新后文件已丢失，请重新上传）",
  timeout: "推理请求超时，后端未能及时返回结果",
  "http-error": "推理后端返回错误（服务异常或请求被拒绝）",
  "invalid-payload": "推理后端返回的数据格式异常",
  aborted: "检测请求被中断",
  "network-error": "无法连接推理服务（网络异常或服务不可达）",
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
   * 为空时（预设任务、刷新后丢失、换了浏览器）无法推理，走「无原始音频」失败态。
   */
  const [file, setFile] = React.useState<File | null>(null);
  React.useEffect(() => {
    setFile(getStashedFile(taskId));
  }, [taskId]);

  const {
    progress,
    phase,
    phaseIndex,
    isFinished,
    started,
    metrics,
    live,
    source,
    waitingForInference,
    failureReason,
    retry,
  } = useDetectionSimulation(task, baseResult, { file });

  // 真实推理优先；没有结果时只返回 base（不再回填随机数），失败态由 source 驱动 UI。
  const result = React.useMemo(
    () => mergeInferenceResult(baseResult, live, metrics),
    [baseResult, live, metrics]
  );

  /**
   * 是否真的做了声纹比对：只有 source === "model" 且模型明确回报了 similarity 才算。
   * 失败 / 无音频分支里的数值一律不作为真实结论展示。
   */
  const similarityAvailable =
    source === "model" ? live?.similarityAvailable !== false : false;

  /** 开发期对账：打印最终渲染所用的数值，可与 [Model API] 那条逐字段比 */
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !isFinished) return;
    console.info(
      `[UI Render] 前端渲染结果: ${JSON.stringify({
        taskId: task.id,
        source,
        aiProbability: result.aiProbability,
        similarity: result.similarity,
        similarityAvailable,
        matchedSegments: result.matchedSegments.length,
        audioDuration: result.audioDuration,
        riskLevel: result.riskLevel,
      })}`
    );
  }, [isFinished, source, result, similarityAvailable, task.id]);

  /**
   * 把真实检测结果 / 失败状态写回内存态任务，供工作台与检测中心列表回看。
   * 只在客户端、且检测确实「跑完了」时才写：
   *   - source === "model" → 写入真实结果，标记 done
   *   - source === "failed" → 标记 failed（不写随机结果）
   *   - source === "noFile" → 不写（刷新后内存文件已丢，任务本身也查不到了）
   */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isFinished) return;
    if (source === "model") {
      updateTaskResult(task.id, {
        result,
        status: "done",
        progress: 100,
        detectType: task.detectType,
      });
    } else if (source === "failed") {
      updateTaskResult(task.id, { status: "failed", progress: 100 });
    }
  }, [isFinished, source, result, task.id, task.detectType]);

  return (
    <DetectShell
      maxWidth="max-w-[880px]"
      subtitle={
        isFinished && source !== "model"
          ? `任务编号 ${task.id} · 检测未完成，未获得有效结果`
          : isFinished && !similarityAvailable
            ? `任务编号 ${task.id} · 本次结果由 AI 生成鉴别输出，未进行指纹比对与旋律特征提取`
            : `任务编号 ${task.id} · 结果由「AI 鉴别 + 指纹比对 + 旋律特征提取」三段链路综合判定`
      }
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
                <StatusBadge
                  status={
                    isFinished
                      ? source === "model"
                        ? "done"
                        : "failed"
                      : task.status
                  }
                />
                {isFinished && source === "model" ? <RiskBadge level={result.riskLevel} /> : null}
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
            /* 只有「动画跑完了、但结果还没到」才算等待；本地 2.8s 就返回时不该改文案 */
            waiting={waitingForInference && progress >= 100}
          />
        ) : null}

        {/* 结果区：失败/无音频 → 明确错误态；成功 → 正常结果；进行中 → 骨架屏 */}
        {isFinished && source !== "model" ? (
          <div className="animate-fade-up rounded-xl border border-destructive/30 bg-destructive/[0.04] p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-foreground">
                  {source === "failed" ? "检测失败，未获得有效结果" : "未找到原始音频"}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  {source === "failed"
                    ? FAILURE_REASON_LABEL[failureReason ?? ""] ??
                      "模型推理请求失败，本次未产出有效检测结论。"
                    : "原始音频仅在本次上传会话中保留，刷新或直接打开链接后已丢失，请重新上传检测。"}
                </p>
                {source === "failed" && failureReason ? (
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    错误代码：{failureReason}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                {source === "failed" ? (
                  <Button size="sm" variant="outline" onClick={() => void retry()}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    重试
                  </Button>
                ) : null}
                <Button size="sm" asChild>
                  <Link href="/detect/new">
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                    重新上传
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : isFinished ? (
          <div className="space-y-4 animate-fade-up">
            <div className="grid gap-3 md:grid-cols-2">
              <AIProbabilityCard
                probability={result.aiProbability}
                animate
                peak={live?.aiProbabilityPeak}
                windows={live?.windows}
              />
              <SimilarityCard
                similarity={result.similarity}
                animate
                available={similarityAvailable}
              />
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  匹配片段
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {!similarityAvailable
                    ? "未进行指纹比对"
                    : result.matchedSegments.length > 0
                      ? `${result.matchedSegments.length} 处命中 · 已在波形图高亮`
                      : "无显著命中"}
                </span>
              </div>
              <MatchedSegments
                segments={result.matchedSegments}
                available={similarityAvailable}
              />
            </div>

            <ResultPanel result={result} duration={result.audioDuration} animate />

            {/* 逐窗概率时间轴：仅真实推理（source === "model"）且后端确实给了逐窗概率时渲染 */}
            {source === "model" && result.windowProbabilities && result.windowProbabilities.length > 0 ? (
              <WindowTimeline
                windowProbabilities={result.windowProbabilities}
                duration={result.audioDuration}
                segments={result.windows ?? result.windowProbabilities.length}
                breakpoints={result.breakpoints}
              />
            ) : null}

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
    <AuthGate>
      <React.Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-background text-[13px] text-muted-foreground">
            正在加载检测任务…
          </div>
        }
      >
        <DetectResultContent />
      </React.Suspense>
    </AuthGate>
  );
}
