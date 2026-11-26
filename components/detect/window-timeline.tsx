"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import type { Breakpoint } from "@/lib/types";
import { formatClock } from "@/lib/utils";

export interface WindowTimelineProps {
  /** 逐窗概率（单位 %），顺序对应滑窗顺序 */
  windowProbabilities: number[];
  /** 音频时长（秒） */
  duration: number;
  /** 参与推理的窗口数 */
  segments: number;
  /** 风格断裂点（真实推理才产出） */
  breakpoints?: Breakpoint[];
}

/** 概率 -> 颜色（P<20 绿 / 20-40 黄绿 / 40-60 黄 / 60-80 橙 / >=80 红） */
function colorOf(p: number): string {
  if (p < 20) return "#22c55e";
  if (p < 40) return "#a3e635";
  if (p < 60) return "#eab308";
  if (p < 80) return "#f97316";
  return "#ef4444";
}

/** 概率 -> 档位（与图例顺序一致，用于窗口占比统计） */
const BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "<20% 真人", min: 0, max: 20 },
  { label: "20–40% 偏真人", min: 20, max: 40 },
  { label: "40–60% 存疑", min: 40, max: 60 },
  { label: "60–80% 偏 AI", min: 60, max: 80 },
  { label: "≥80% AI", min: 80, max: Infinity },
];

function bucketOf(p: number): number {
  if (p < 20) return 0;
  if (p < 40) return 1;
  if (p < 60) return 2;
  if (p < 80) return 3;
  return 4;
}

/**
 * 把逐窗概率渲染成时间轴。
 *
 * 严格按「真实区间」绘制，不做任何插值 / 平滑 / 按秒平均：
 * 滑窗是 50% 重叠的（chunk=10s / hop=5s），任何平滑都会把真实断裂点抹掉约 5 秒。
 * 每根条代表一个 10 秒窗口的真实区间，透明度 50%，相邻重叠段颜色自然加深。
 */
export function WindowTimeline({
  windowProbabilities,
  duration,
  segments,
  breakpoints = [],
}: WindowTimelineProps) {
  const n = windowProbabilities.length;
  // 窗口起点反推：hop = (duration - chunk) / (segments - 1)，chunk 固定 10s
  const chunk = 10;
  const hop = segments > 1 ? (duration - chunk) / (segments - 1) : 0;

  // 各档窗口数统计（用于「窗口占比」可视化，纯展示，不参与判决）
  const bucketCounts = [0, 0, 0, 0, 0];
  for (const p of windowProbabilities) bucketCounts[bucketOf(p)] += 1;
  const strongCount = bucketCounts[3] + bucketCounts[4]; // P>=60 的窗口数

  const width = 720;
  const height = 96;
  const padLeft = 34;
  const padRight = 12;
  const plotW = width - padLeft - padRight;

  /** 秒 -> 横坐标像素 */
  const xOf = (sec: number) => padLeft + (sec / duration) * plotW;

  // 每秒像素：10 秒窗口的条宽
  const pxPerSec = plotW / Math.max(duration, 1);
  const barWidth = Math.max(2, chunk * pxPerSec);

  // 纵轴（概率 0-100）映射到高度
  const topY = 12;
  const bottomY = height - 20;
  const yOf = (p: number) => bottomY - (Math.min(Math.max(p, 0), 100) / 100) * (bottomY - topY);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(duration * f));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-foreground">逐窗概率时间轴</p>
        <span className="text-[11px] text-muted-foreground">
          {n} 个 10 秒窗口 · 50% 重叠
        </span>
      </div>

      {/* 窗口占比可视化：横向堆叠条 + 各档占比，纯展示，不参与判决 */}
      <div className="mt-4 rounded-lg border border-border/60 bg-secondary/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-foreground">窗口占比分布</p>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            P≥60% 强证据：{strongCount} / {n} 窗 · {((strongCount / n) * 100).toFixed(1)}%
          </span>
        </div>

        {/* 堆叠条：每档宽度 = 该档窗口数 / 总窗口数 */}
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full">
          {bucketCounts.map((count, i) =>
            count > 0 ? (
              <div
                key={i}
                style={{
                  width: `${(count / n) * 100}%`,
                  background: colorOf(BUCKETS[i].min),
                }}
                title={`${BUCKETS[i].label}：${count} 窗（${((count / n) * 100).toFixed(1)}%）`}
              />
            ) : null
          )}
        </div>

        {/* 各档明细 */}
        <div className="mt-2.5 grid grid-cols-5 gap-1.5 text-[10px]">
          {BUCKETS.map((bucket, i) => {
            const count = bucketCounts[i];
            return (
              <div key={i} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: colorOf(bucket.min) }}
                />
                <span className="truncate text-muted-foreground">
                  {bucket.label.split(" ")[0]}
                </span>
                <span className="ml-auto tabular-nums text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {breakpoints.length > 0 ? (
        <div className="mt-3 space-y-2">
          {breakpoints.map((bp, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/[0.08] px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
              <p className="text-[11px] leading-5 text-foreground">
                检测到风格断裂（{bp.start.toFixed(0)}–{bp.end.toFixed(0)}s），
                {bp.direction === "ai_to_human"
                  ? "前段判定 AI、后段判定真人"
                  : "前段判定真人、后段判定 AI"}
                ，建议人工复核该区间。
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label="逐窗概率时间轴，颜色越暖代表该窗口越像 AI"
        >
          {/* 50% 参考线 */}
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yOf(50)}
            y2={yOf(50)}
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
          <text
            x={padLeft - 6}
            y={yOf(50) + 3}
            textAnchor="end"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
          >
            50
          </text>
          <text
            x={padLeft - 6}
            y={yOf(100) + 3}
            textAnchor="end"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
          >
            100
          </text>
          <text
            x={padLeft - 6}
            y={bottomY + 3}
            textAnchor="end"
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
          >
            0
          </text>

          {/* 每个窗口一条真实区间条形，透明度 50%，重叠处自然加深 */}
          {windowProbabilities.map((p, i) => {
            const start = i * hop;
            const end = start + chunk;
            return (
              <rect
                key={i}
                x={xOf(start)}
                y={yOf(p)}
                width={Math.max(1.5, xOf(end) - xOf(start))}
                height={bottomY - yOf(p)}
                fill={colorOf(p)}
                fillOpacity={0.5}
                rx="1.5"
              />
            );
          })}

          {/* 断裂点高亮区间 */}
          {breakpoints.map((bp, index) => (
            <rect
              key={`bp-${index}`}
              x={xOf(bp.start)}
              y={topY - 2}
              width={Math.max(2, xOf(bp.end) - xOf(bp.start))}
              height={bottomY - topY + 4}
              fill="none"
              stroke="hsl(var(--warn))"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              rx="2"
            />
          ))}

          {/* 时间刻度 */}
          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={xOf(tick)}
                x2={xOf(tick)}
                y1={bottomY + 2}
                y2={bottomY + 5}
                stroke="hsl(var(--muted-foreground) / 0.5)"
                strokeWidth="1"
              />
              <text
                x={xOf(tick)}
                y={height - 3}
                textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {formatClock(tick)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 图例 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#22c55e" }} />
          {"<20% 真人"}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#a3e635" }} />
          {"20–40% 偏真人"}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#eab308" }} />
          {"40–60% 存疑"}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#f97316" }} />
          {"60–80% 偏 AI"}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#ef4444" }} />
          {"≥80% AI"}
        </span>
      </div>

      {/* 逐窗明细（悬停提示已在 title 里，这里另给可读列表供详情下钻） */}
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
          展开逐窗明细
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border/60">
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
              {windowProbabilities.map((p, i) => {
                const start = i * hop;
                const end = start + chunk;
                return (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-2 py-1 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1 tabular-nums text-muted-foreground">
                      {start.toFixed(1)}–{end.toFixed(1)}s
                    </td>
                    <td
                      className="px-2 py-1 text-right tabular-nums"
                      style={{ color: colorOf(p) }}
                    >
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
      </details>
    </div>
  );
}
