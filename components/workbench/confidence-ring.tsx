"use client";

import * as React from "react";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface ConfidenceRingProps {
  /** 0-100 */
  value: number;
  /** 圆环直径（CSS px） */
  size?: number;
  strokeWidth?: number;
  caption?: string;
  className?: string;
}

/**
 * 置信度圆环。
 * 渐变 id 用 useId 生成：同一个页面会同时出现「主判定卡」和「详情面板」两个实例，
 * 写死 id="confGrad" 会让两个 SVG 抢同一个渐变定义。
 */
export function ConfidenceRing({
  value,
  size = 128,
  strokeWidth = 9,
  caption = "置信度",
  className,
}: ConfidenceRingProps) {
  const gradientId = React.useId().replace(/:/g, "");
  const safe = Math.min(100, Math.max(0, value));
  const offset = CIRCUMFERENCE * (1 - safe / 100);

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${caption} ${safe.toFixed(1)}%`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "hsl(var(--grad-from))" }} />
            <stop offset="55%" style={{ stopColor: "hsl(var(--grad-via))" }} />
            <stop offset="100%" style={{ stopColor: "hsl(var(--grad-to))" }} />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--border) / 0.55)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--grad-via) / 0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[26px] font-semibold leading-none text-foreground">
          {safe.toFixed(1)}
          <span className="text-[11px] text-muted-foreground">%</span>
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {caption}
        </span>
      </div>
    </div>
  );
}
