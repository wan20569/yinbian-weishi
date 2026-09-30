"use client";

import { FileAudio, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/utils";

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  hint,
}: {
  fileName: string;
  fileSize: number;
  progress: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
          <FileAudio className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-foreground">{fileName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{formatFileSize(fileSize)}</p>
        </div>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      </div>

      <Progress value={progress} className="mt-4" />

      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{hint}</span>
        <span className="tabular-nums text-primary">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
