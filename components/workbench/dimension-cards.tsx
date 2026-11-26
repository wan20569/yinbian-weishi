"use client";

import * as React from "react";

import type { ChartGeometry } from "@/lib/workbench-model";

export interface DimensionCardsProps {
  charts: ChartGeometry;
  /** AI 概率（已不再用于生成任何子指标，仅保留以兼容调用方签名） */
  aiProbability: number;
  duration: number;
}

/**
 * 多维分析：三张图全部由 waveformData 派生（切任务图会变）。
 * 只展示真实的派生可视化，不再用「概率 ± 常数」或取模运算编造任何测量值
 * （BPM / 人声占比 / 规律度这类需要信号分析的量，本项目当前没有真实数据，一律不显示数字）。
 */
export function DimensionCards({ charts }: DimensionCardsProps) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Multi-dimension · 分析图谱</p>
          <h2 className="mt-1.5 text-[19px] font-semibold tracking-tight text-foreground">多维度分析</h2>
        </div>
        <div className="flex gap-1.5 text-[10px]">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
            频谱
          </span>
          <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-foreground/70">
            人声
          </span>
          <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-foreground/70">
            节奏
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* 频谱分布 */}
        <article className="panel p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">频谱分布</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Spectrum · 0–24 kHz
              </p>
            </div>
            <span className="rounded-md border border-[hsl(var(--warn)/0.2)] bg-[hsl(var(--warn)/0.08)] px-2 py-0.5 text-[9px] text-warn">
              16k 截断
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-border/60 bg-[hsl(var(--waveform))] p-2">
            <svg
              viewBox={`0 0 ${charts.width} ${charts.height}`}
              className="h-[120px] w-full"
              role="img"
              aria-label="频谱分布图，高频段能量明显截断"
            >
              <defs>
                <linearGradient id={`${uid}-spec-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--grad-from))", stopOpacity: 0.42 }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--grad-via))", stopOpacity: 0 }} />
                </linearGradient>
                <linearGradient id={`${uid}-spec-line`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--grad-from))" }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--grad-to))" }} />
                </linearGradient>
              </defs>

              <g stroke="hsl(var(--foreground) / 0.07)" strokeWidth="1">
                {[24, 50, 76, 102].map((y) => (
                  <line key={y} x1="0" x2={charts.width} y1={y} y2={y} />
                ))}
              </g>

              <path d={charts.spectrum.area} fill={`url(#${uid}-spec-area)`} />
              <path
                d={charts.spectrum.line}
                fill="none"
                stroke={`url(#${uid}-spec-line)`}
                strokeWidth="1.8"
              />

              <line
                x1={charts.spectrum.cutoffX}
                x2={charts.spectrum.cutoffX}
                y1="14"
                y2="104"
                stroke="hsl(var(--warn) / 0.8)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={charts.spectrum.cutoffX + 6}
                y="22"
                fill="hsl(var(--warn))"
                fontSize="9"
                fontFamily="monospace"
              >
                -18 dB
              </text>

              <g fill="hsl(var(--muted-foreground) / 0.45)">
                {Array.from({ length: 7 }).map((_, i) => (
                  <rect
                    key={i}
                    x={charts.spectrum.cutoffX + 8 + i * 14}
                    y={98 + (i % 3)}
                    width="8"
                    height={3 + (i % 4)}
                    rx="1"
                  />
                ))}
              </g>
            </svg>
          </div>

          <div className="num mt-2 flex justify-between text-[9px] text-muted-foreground">
            <span>0</span>
            <span>8k</span>
            <span>16k</span>
            <span>24k</span>
          </div>
        </article>

        {/* 人声能量 */}
        <article className="panel p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">人声能量</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Vocal · 200 Hz–4 kHz
              </p>
            </div>
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">
              中频段
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-border/60 bg-[hsl(var(--waveform))] p-2">
            <svg
              viewBox={`0 0 ${charts.width} ${charts.height}`}
              className="h-[120px] w-full"
              role="img"
              aria-label="人声能量曲线，能量集中在中频段"
            >
              <defs>
                <linearGradient id={`${uid}-vocal-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--grad-to))", stopOpacity: 0.4 }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--grad-via))", stopOpacity: 0 }} />
                </linearGradient>
              </defs>

              <g stroke="hsl(var(--foreground) / 0.07)" strokeWidth="1">
                {[28, 58, 88].map((y) => (
                  <line key={y} x1="0" x2={charts.width} y1={y} y2={y} />
                ))}
              </g>

              <rect
                x={charts.vocal.band.x}
                y="10"
                width={charts.vocal.band.width}
                height="98"
                fill="hsl(var(--grad-to) / 0.08)"
              />
              <line
                x1={charts.vocal.band.x}
                x2={charts.vocal.band.x}
                y1="10"
                y2="108"
                stroke="hsl(var(--grad-to) / 0.45)"
                strokeDasharray="3 4"
              />
              <line
                x1={charts.vocal.band.x + charts.vocal.band.width}
                x2={charts.vocal.band.x + charts.vocal.band.width}
                y1="10"
                y2="108"
                stroke="hsl(var(--grad-to) / 0.45)"
                strokeDasharray="3 4"
              />

              <path d={charts.vocal.area} fill={`url(#${uid}-vocal-area)`} />
              <path
                d={charts.vocal.line}
                fill="none"
                stroke="hsl(var(--grad-to))"
                strokeWidth="1.8"
              />

              <text
                x={charts.vocal.band.x + 6}
                y="22"
                fill="hsl(var(--grad-to))"
                fontSize="9"
                fontFamily="monospace"
              >
                VOCAL
              </text>
            </svg>
          </div>

          <div className="num mt-2 flex justify-between text-[9px] text-muted-foreground">
            <span>20 Hz</span>
            <span>1k</span>
            <span>8k</span>
            <span>24k</span>
          </div>
        </article>

        {/* 节奏密度 */}
        <article className="panel p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">节奏密度</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Rhythm · 波形派生
              </p>
            </div>
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">
              波形派生
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-border/60 bg-[hsl(var(--waveform))] p-2">
            <svg
              viewBox={`0 0 ${charts.width} ${charts.height}`}
              className="h-[120px] w-full"
              role="img"
              aria-label="节奏密度柱状图，鼓点间隔高度规律"
            >
              <defs>
                <linearGradient id={`${uid}-rhythm-a`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--grad-via))", stopOpacity: 0.35 }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--grad-from))", stopOpacity: 0.95 }} />
                </linearGradient>
                <linearGradient id={`${uid}-rhythm-b`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" style={{ stopColor: "hsl(var(--grad-to))", stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: "hsl(var(--grad-to))", stopOpacity: 0.9 }} />
                </linearGradient>
              </defs>

              <g stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1">
                {[36, 68, 100].map((y) => (
                  <line key={y} x1="0" x2={charts.width} y1={y} y2={y} />
                ))}
              </g>

              {charts.rhythm.map((bar, index) => (
                <rect
                  key={index}
                  x={bar.x}
                  y={bar.y}
                  width="11"
                  height={bar.height}
                  rx="3"
                  fill={`url(#${uid}-rhythm-${index % 2 === 0 ? "a" : "b"})`}
                />
              ))}

              <line
                x1="0"
                x2={charts.width}
                y1="108"
                y2="108"
                stroke="hsl(var(--foreground) / 0.2)"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="num mt-2 flex justify-between text-[9px] text-muted-foreground">
            <span>0:00</span>
            <span>0:30</span>
            <span>1:00</span>
            <span>1:30</span>
          </div>
        </article>
      </div>
    </section>
  );
}
