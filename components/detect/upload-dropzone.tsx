"use client";

import * as React from "react";
import { FileAudio, Upload, X } from "lucide-react";

import { cn, formatFileSize } from "@/lib/utils";

export interface UploadDropzoneProps {
  onSelectFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

const ACCEPT = ".mp3,.wav,.flac,.m4a,.aac,.ogg";

export function UploadDropzone({ onSelectFile, disabled = false, className }: UploadDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const MAX_BYTES = 50 * 1024 * 1024;

  const validate = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.split(",").includes(ext)) {
      setError("仅支持 MP3 / WAV / FLAC / M4A / AAC / OGG 格式");
      return false;
    }
    if (file.size > MAX_BYTES) {
      setError("文件超过 50MB，请压缩后重试");
      return false;
    }
    setError(null);
    return true;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (validate(file)) onSelectFile(file);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200 grid-noise",
          dragging
            ? "border-primary bg-primary/[0.07]"
            : "border-border bg-card/50 hover:border-primary/45 hover:bg-card",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <span
          className={cn(
            "grid h-14 w-14 place-items-center rounded-2xl border transition-colors",
            dragging
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border bg-secondary text-primary"
          )}
        >
          <Upload className="h-6 w-6" />
        </span>

        <p className="mt-5 text-[15px] font-medium text-foreground">拖拽音频到此处，或点击选择文件</p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          支持 MP3 / WAV / FLAC / M4A，单个文件不超过 50MB
        </p>

        <div className="mt-6 flex items-center gap-2">
          {["MP3", "WAV", "FLAC", "M4A"].map((item) => (
            <span
              key={item}
              className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-destructive">
          <X className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground/80">
        <FileAudio className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        音频仅在前端做 mock 处理，不会上传到任何服务器；建议时长 30 秒以上以获得更稳定的判别结果。
      </p>
    </div>
  );
}

export function SelectedFileCard({ name, size }: { name: string; size: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
        <FileAudio className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-foreground">{name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatFileSize(size)}</p>
      </div>
    </div>
  );
}
