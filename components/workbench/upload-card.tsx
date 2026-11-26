"use client";

import Link from "next/link";
import { ArrowUpRight, FolderOpen, ScanLine, Upload } from "lucide-react";

import { LiveSpectrum } from "@/components/workbench/live-spectrum";

export interface UploadCardProps {
  peaks?: number[];
}

/**
 * 上传卡：视觉外壳全部新做，但落点仍然是现有的 /detect/new。
 * 不在这里重写第二套文件读取逻辑——文件校验、拖拽、进度、真实推理
 * 都在 app/detect/new 里，重复实现只会让两条链路行为不一致。
 */
export function UploadCard({ peaks }: UploadCardProps) {
  return (
    <section className="panel scroll-mt-6 p-5 sm:p-6" id="upload">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">上传音频</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">拖拽文件或从本地选择，立即开始分析</p>
        </div>
        <span className="num rounded-md border border-border bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground">
          ≤ 50 MB
        </span>
      </div>

      <LiveSpectrum peaks={peaks} />

      <Link
        href="/detect/new"
        className="group mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-7 text-center transition hover:border-primary/50 hover:bg-primary/[0.04]"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
          <Upload className="h-5 w-5" />
        </span>
        <span className="mt-3 text-[13px] font-medium text-foreground">
          拖拽音频到这里，或点击选择文件
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          MP3 / WAV / FLAC / AAC / M4A / OGG
        </span>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-[11px] text-foreground/80 transition-colors group-hover:border-primary/35 group-hover:text-primary">
          <FolderOpen className="h-3.5 w-3.5" />
          选择本地文件
        </span>
      </Link>

      <p className="mt-2 text-[11px] text-muted-foreground">
        支持 6 种格式 · 单文件 ≤ 50MB · 时长 ≤ 10 分钟
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/detect/new"
          className="grad-bg inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[hsl(var(--grad-ink))] transition hover:brightness-110"
        >
          <ScanLine className="h-4 w-4" />
          开始检测
        </Link>
        <Link
          href="/?view=reports"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-[12px] text-foreground/80 transition hover:border-primary/35 hover:text-foreground"
        >
          查看示例报告
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
