"use client";

import * as React from "react";
import type WaveSurferInstance from "wavesurfer.js";
import { Pause, Play } from "lucide-react";

import type { MatchedSegment } from "@/lib/types";
import { cn, clamp, formatClock } from "@/lib/utils";

export interface AudioWaveformProps {
  peaks: number[];
  duration: number;
  segments?: MatchedSegment[];
  className?: string;
  /** 是否显示播放控件 */
  controls?: boolean;
  height?: number;
}

/**
 * 波形展示：使用 wavesurfer.js 以 mock 峰值渲染（不加载音频文件，避免二进制依赖）；
 * 若初始化失败则降级为静态柱状波形。播放进度由前端模拟。
 */
export function AudioWaveform({
  peaks,
  duration,
  segments = [],
  className,
  controls = true,
  height = 132,
}: AudioWaveformProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const [useFallback, setUseFallback] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);

  // wavesurfer 渲染
  React.useEffect(() => {
    let disposed = false;
    let instance: WaveSurferInstance | null = null;
    const readyTimer = window.setTimeout(() => {
      if (!disposed) setUseFallback(true);
    }, 1500);

    import("wavesurfer.js")
      .then((mod) => {
        if (disposed || !containerRef.current) return;
        const WaveSurfer = mod.default;
        instance = WaveSurfer.create({
          container: containerRef.current,
          height,
          waveColor: "#3A4351",
          progressColor: "#2DD4BF",
          cursorColor: "transparent",
          barWidth: 3,
          barGap: 2,
          barRadius: 3,
          normalize: true,
          interact: false,
          peaks: [peaks],
          duration,
        });
        instance.on("ready", () => {
          window.clearTimeout(readyTimer);
        });
      })
      .catch(() => {
        if (!disposed) setUseFallback(true);
      });

    return () => {
      disposed = true;
      window.clearTimeout(readyTimer);
      instance?.destroy();
    };
  }, [peaks, duration, height]);

  // 模拟播放
  React.useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, duration]);

  const ratio = React.useCallback(
    (seconds: number) => clamp((seconds / duration) * 100, 0, 100),
    [duration]
  );

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setCurrentTime(percent * duration);
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(duration * f));

  return (
    <div className={cn("select-none", className)}>
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-[#11161E]"
        style={{ height: height + 44 }}
        onClick={handleSeek}
      >
        {/* 匹配片段高亮层 */}
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="absolute inset-y-0 z-20 border-l border-r border-destructive/40 bg-destructive/[0.14]"
            style={{
              left: `${ratio(segment.start)}%`,
              width: `${Math.max(1.2, ratio(segment.end) - ratio(segment.start))}%`,
            }}
          >
            <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded-b bg-destructive/85 px-1.5 py-[2px] text-[9px] font-medium leading-none text-white">
              {formatClock(segment.start)} - {formatClock(segment.end)}
            </span>
          </div>
        ))}

        {/* 波形层 */}
        <div className="absolute inset-x-0 top-0 px-1 pt-1" style={{ height }}>
          <div ref={containerRef} className={cn("h-full w-full", useFallback && "hidden")} />
          {useFallback ? (
            <div className="flex h-full items-center gap-[2px] px-1">
              {peaks.map((peak, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 rounded-full",
                    currentTime / duration > index / peaks.length ? "bg-primary" : "bg-[#3A4351]"
                  )}
                  style={{ height: `${Math.max(6, peak * 100)}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* 播放头 */}
        <div
          className="pointer-events-none absolute inset-y-0 z-30 w-[1.5px] bg-primary/90"
          style={{ left: `${ratio(currentTime)}%` }}
        />

        {/* 时间轴 */}
        <div className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-between border-t border-border/60 px-3 text-[10px] text-muted-foreground">
          {ticks.map((tick, index) => (
            <span key={index}>{formatClock(tick)}</span>
          ))}
        </div>
      </div>

      {controls ? (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((prev) => !prev)}
            className="group grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/18"
            aria-label={playing ? "暂停" : "播放"}
          >
            {playing ? (
              <Pause className="h-4 w-4 transition-transform duration-200 group-hover:scale-130" />
            ) : (
              <Play className="h-4 w-4 transition-transform duration-200 group-hover:scale-130" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100"
                style={{ width: `${ratio(currentTime)}%` }}
              />
            </div>
          </div>
          <span className="w-24 text-right text-[11px] tabular-nums text-muted-foreground">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
