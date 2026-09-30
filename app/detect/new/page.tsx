"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { DetectShell } from "@/components/layout/detect-shell";
import { DetectTypeSelector } from "@/components/detect/detect-type-selector";
import { SelectedFileCard, UploadDropzone } from "@/components/detect/upload-dropzone";
import { UploadProgress } from "@/components/detect/upload-progress";
import { useUploadSimulation } from "@/hooks/use-upload-simulation";
import { detectTypeOptions } from "@/lib/mock-data";
import { createTaskId, registerTask } from "@/lib/mock-service";
import type { DetectType, Task } from "@/lib/types";

export default function NewDetectionPage() {
  const router = useRouter();
  const [detectType, setDetectType] = React.useState<DetectType>("comprehensive");
  const { file, progress, stage, start, cancel } = useUploadSimulation();

  const busy = stage === "uploading" || stage === "finishing";

  const handleSelectFile = (selected: File) => {
    start({ name: selected.name, size: selected.size }, (finished) => {
      const id = createTaskId();
      const task: Task = {
        id,
        fileName: finished.name,
        fileSize: finished.size,
        duration: 213,
        createdAt: new Date().toISOString(),
        status: "queued",
        detectType,
        progress: 0,
      };
      registerTask(task);
      router.push(`/detect/${id}?type=${detectType}&name=${encodeURIComponent(finished.name)}`);
    });
  };

  const hint =
    stage === "finishing"
      ? "上传完成，正在创建检测任务…"
      : stage === "done"
        ? "任务已创建，正在跳转结果页…"
        : "正在上传并校验音频完整性（mock）";

  return (
    <DetectShell
      maxWidth="max-w-[720px]"
      subtitle="上传待检测音频，平台将通过「轻量 CNN 鉴别 → 音频指纹比对 → 旋律特征提取」递进链路输出结果。"
    >
      {!file ? (
        <>
          <UploadDropzone onSelectFile={handleSelectFile} />
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground">检测类型</p>
              <span className="text-[11px] text-muted-foreground">综合检测覆盖全链路，推荐初次使用</span>
            </div>
            <DetectTypeSelector
              options={detectTypeOptions}
              value={detectType}
              onChange={setDetectType}
            />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <UploadProgress
            fileName={file.name}
            fileSize={file.size}
            progress={progress}
            hint={hint}
          />

          {stage === "uploading" ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={cancel}
                className="text-[12px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                取消本次上传
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-3 text-[12px] text-primary">
              <CheckCircle2 className="h-4 w-4" />
              已创建任务，正在跳转检测结果页…
            </div>
          )}

          <div className="opacity-60">
            <SelectedFileCard name={file.name} size={file.size} />
          </div>
        </div>
      )}
    </DetectShell>
  );
}
