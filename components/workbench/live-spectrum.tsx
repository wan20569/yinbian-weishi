"use client";

import * as React from "react";

/**
 * 实时声波 + 频谱可视化（canvas）
 *
 * 高度由 peaks（即 task.result.waveformData）决定，动画只叠加相位，
 * 所以不同任务画出来的包络不同，但同一任务每次都一致。
 * 组件卸载 / 切换视图时会取消 rAF 并断开 ResizeObserver，避免后台空转。
 */
export function LiveSpectrum({ peaks }: { peaks?: number[] }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const peaksRef = React.useRef<number[] | undefined>(peaks);

  React.useEffect(() => {
    peaksRef.current = peaks;
  }, [peaks]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let phase = 0;
    let width = 0;
    let height = 0;
    let stopped = false;

    const token = (name: string, alpha: number, fallback: string) => {
      const raw = getComputedStyle(canvas).getPropertyValue(name).trim();
      return raw ? `hsl(${raw} / ${alpha})` : fallback;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const BARS = 96;

    const draw = () => {
      if (stopped || width === 0) return;

      const baseY = height - 18;
      ctx.clearRect(0, 0, width, height);

      /* 横向参考线 */
      ctx.strokeStyle = token("--grid-line", 0.12, "rgba(99,120,255,0.12)");
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g += 1) {
        const y = 22 + g * ((height - 34) / 4);
        ctx.beginPath();
        ctx.moveTo(14, y);
        ctx.lineTo(width - 14, y);
        ctx.stroke();
      }

      /* 柱状频谱 */
      const barGradient = ctx.createLinearGradient(0, height, 0, 10);
      barGradient.addColorStop(0, token("--grad-via", 0.12, "rgba(37,99,235,0.12)"));
      barGradient.addColorStop(0.55, token("--grad-from", 0.6, "rgba(56,189,248,0.55)"));
      barGradient.addColorStop(1, token("--grad-to", 0.95, "rgba(167,139,250,0.95)"));

      const source = peaksRef.current;
      const step = width / BARS;
      const barWidth = Math.max(2, step - 3);

      for (let i = 0; i < BARS; i += 1) {
        const ratio = i / BARS;
        const sample = source
          ? source[Math.min(source.length - 1, Math.floor(ratio * source.length))]
          : 0.42 + 0.34 * Math.sin(ratio * 9);

        const envelope = 0.35 + 0.65 * Math.exp(-Math.pow((ratio - 0.45) * 2.6, 2));
        const wave = 0.32 + 0.68 * Math.abs(Math.sin(i * 0.31 + phase) * Math.cos(i * 0.11 - phase * 0.6));
        const barHeight = Math.max(
          3,
          (0.25 + sample * 0.75) * envelope * wave * (height * 0.66)
        );

        const x = i * step + 1.5;
        ctx.fillStyle = barGradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, baseY - barHeight, barWidth, barHeight, 2);
        } else {
          ctx.rect(x, baseY - barHeight, barWidth, barHeight);
        }
        ctx.fill();

        /* 底部倒影 */
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = token("--grad-from", 0.8, "rgba(96,165,250,0.8)");
        ctx.beginPath();
        const mirror = Math.min(24, barHeight * 0.32);
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, baseY + 3, barWidth, mirror, 2);
        } else {
          ctx.rect(x, baseY + 3, barWidth, mirror);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      /* 叠加声波曲线 */
      ctx.beginPath();
      for (let px = 0; px <= width; px += 6) {
        const y =
          baseY -
          height * 0.28 +
          Math.sin(px * 0.021 + phase * 1.4) * (height * 0.14) +
          Math.sin(px * 0.006 - phase) * (height * 0.07);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.strokeStyle = token("--grad-to", 0.55, "rgba(196,181,253,0.55)");
      ctx.lineWidth = 1.4;
      ctx.stroke();

      phase += 0.045;
      if (!reduceMotion) raf = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-border/70 bg-[hsl(var(--waveform))]">
      <canvas
        ref={canvasRef}
        className="block h-[150px] w-full"
        role="img"
        aria-label="实时声波与频谱可视化"
      />

      <div className="pointer-events-none absolute left-4 top-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-primary/80">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Live spectrum
      </div>

      <div className="num pointer-events-none absolute right-4 top-3 text-[9px] text-muted-foreground">
        48 kHz · FFT 2048
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-1.5 flex items-center justify-between text-[9px] text-muted-foreground/70">
        <span className="num">0.0 s</span>
        <span>实时声波</span>
        <span className="num">30.0 s</span>
      </div>
    </div>
  );
}
