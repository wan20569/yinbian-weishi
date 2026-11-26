"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, AudioLines, ChevronDown, FileText, Info, Loader2, X } from "lucide-react";

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
import type { DetectionResult, Task } from "@/lib/types";
import { formatDateTime, formatDuration, formatFileSize } from "@/lib/utils";

export function DetailPanel({ task, onClose }: { task: Task | null; onClose?: () => void }) {
  if (!task) {
    return (
      <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border/60 bg-[hsl(var(--sidebar)/0.9)] backdrop-blur-xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
          <span className="text-[13px] font-medium text-foreground">任务详情</span>
          {onClose ? <CloseButton onClose={onClose} /> : null}
        </div>
        <div className="flex-1 overflow-y-auto thin-scrollbar p-5">
          <EmptyState variant="no-result" compact />
          <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
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
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border/60 bg-[hsl(var(--sidebar)/0.9)] backdrop-blur-xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
        <span className="text-[13px] font-medium text-foreground">任务详情</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {onClose ? <CloseButton onClose={onClose} /> : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto thin-scrollbar p-5">
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/60 text-primary">
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
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-5">
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
              本次检测未获得有效结果，可能原因：推理服务超时、网络异常或返回数据异常。请重新上传后再试。
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
              <Link href={`/detect/${task.id}`} className="group/link">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-primary">
                  <FileText className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:scale-130" />
                  查看完整结果页
                </span>
              </Link>
            </div>
            <ComplianceNotice text="本报告仅为技术参考，不等同司法鉴定意见。" />

            {/* 为什么这样判：默认折叠的下钻面板 */}
            <WhyPanel result={result} />
          </>
        ) : null}
      </div>
    </aside>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="关闭任务详情"
      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/** 中位数（不改动原数组） */
function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 滑窗起点反推：hop = (duration - chunk) / (segments - 1)，chunk 固定 10s */
function windowHop(duration: number, segments: number): number {
  const chunk = 10;
  return segments > 1 ? (duration - chunk) / (segments - 1) : 0;
}

interface HealthInfo {
  model: string;
  params: number;
  melMode: string;
}

/**
 * 「为什么这样判」下钻面板（默认折叠）。
 * 只做解释性展示，不参与判决；所有统计量都明确标注「仅供参考」。
 */
function WhyPanel({ result }: { result: DetectionResult }) {
  const [open, setOpen] = React.useState(false);
  const [health, setHealth] = React.useState<HealthInfo | null>(null);

  // 模型信息来自 /api/health（model / params / melMode），失败则静默留空
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthInfo | null) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {
        /* 后端未启动等情况，模型信息留空展示 */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const windowProbs = result.windowProbabilities;
  const segments = result.windows ?? windowProbs?.length ?? 0;
  const hop = windowHop(result.audioDuration, segments);
  const median = windowProbs ? medianOf(windowProbs) : null;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Info className="h-3.5 w-3.5 text-primary" />
          为什么这样判？
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3 text-[11px] leading-5">
          {/* a) 判决规则原文 */}
          <section>
            <p className="text-[11px] font-medium text-foreground">判决规则</p>
            <p className="mt-1 text-muted-foreground">
              三档阈值：均值 ≥ 70% 判高风险（AI），40%–70% 判中风险（存疑），&lt; 40% 判低风险（真人）。
              经 602 首测试集实测：三档 + 人工复核灰区 acc 0.9867；均值单阈值 0.60 acc 0.9801；
              单阈值 0.70 acc 0.9701。
            </p>
          </section>

          {/* b) 汇总统计量表 */}
          <section>
            <p className="text-[11px] font-medium text-foreground">汇总统计量</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/80">
              以下均不参与判决，仅供参考。
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">均值</dt>
                <dd className="tabular-nums text-foreground">
                  {result.aiProbability.toFixed(1)}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">中位数</dt>
                <dd className="tabular-nums text-foreground">
                  {median !== null ? `${median.toFixed(2)}%` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">峰值</dt>
                <dd className="tabular-nums text-foreground">
                  {result.aiProbabilityPeak !== undefined
                    ? `${result.aiProbabilityPeak.toFixed(2)}%`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">窗口数</dt>
                <dd className="tabular-nums text-foreground">{segments || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">时长</dt>
                <dd className="tabular-nums text-foreground">
                  {formatDuration(result.audioDuration)}
                </dd>
              </div>
            </dl>

            {result.strongWindowCount !== undefined && segments > 0 ? (
              <div className="mt-2">
                <div className="flex justify-between text-[11px]">
                  <dt className="text-muted-foreground">强证据窗口（P&gt;60%）</dt>
                  <dd className="tabular-nums text-foreground">
                    {result.strongWindowCount} / {segments} 窗 ·{" "}
                    {((result.strongWindowCount / segments) * 100).toFixed(1)}%
                  </dd>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground/80">
                  0.5 只是 sigmoid 的自然边界，实测单窗真正的五五开在 P≈0.65，
                  因此这里用 60% 作为强证据门槛。此指标不参与判决。
                </p>
              </div>
            ) : null}
          </section>

          {/* c) 逐窗概率表 */}
          <section>
            <p className="text-[11px] font-medium text-foreground">逐窗概率</p>
            {windowProbs && windowProbs.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/60">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-normal">#</th>
                      <th className="px-2 py-1.5 text-left font-normal">起止</th>
                      <th className="px-2 py-1.5 text-right font-normal">P(AI)</th>
                      <th className="px-2 py-1.5 text-left font-normal">≥50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {windowProbs.map((p, i) => {
                      const start = i * hop;
                      const end = start + 10;
                      return (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-2 py-1 tabular-nums text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-2 py-1 tabular-nums text-muted-foreground">
                            {start.toFixed(1)}–{end.toFixed(1)}s
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-foreground">
                            {p.toFixed(2)}%
                          </td>
                          <td className="px-2 py-1 text-muted-foreground">
                            {p >= 50 ? "是" : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground/80">
                本次结果无逐窗概率数据（非真实推理或历史数据）。
              </p>
            )}
          </section>

          {/* d) 模型信息 */}
          <section>
            <p className="text-[11px] font-medium text-foreground">模型信息</p>
            {health ? (
              <p className="mt-1 text-muted-foreground">
                {health.model} · {health.params.toLocaleString()} 参数 · mel 模式 {health.melMode}
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground/80">加载中或不可用…</p>
            )}
          </section>

          {/* e) 已知局限（原文） */}
          <section className="rounded-lg border border-border/60 bg-secondary/20 p-3">
            <p className="text-[11px] font-medium text-foreground">已知局限</p>
            <p className="mt-1 text-muted-foreground">
              本模型在 Suno 生成的素材上召回率仅约 30%（测试集 10 首 Suno 曲中漏判 7 首），
              其中 4 首所有窗口的 P(AI) 都低于 0.35。这是训练数据分布问题（Suno 仅占
              AI 训练组约 3%，且整首标签被广播到随机 10 秒裁剪上），不是阈值可以修复的。
              若被测素材来自 Suno，判定为『未检出 AI 特征』的结论可靠性显著低于其他来源。
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
