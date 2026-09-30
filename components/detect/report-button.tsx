"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileCheck2, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { simulateReportGeneration } from "@/lib/mock-service";
import { addReport, hasReport } from "@/lib/report-store";
import type { DetectionResult, Task } from "@/lib/types";

export interface ReportButtonProps {
  task: Task;
  result: DetectionResult;
  disabled?: boolean;
  variant?: "solid" | "ghost";
}

export function ReportButton({
  task,
  result,
  disabled = false,
  variant = "solid",
}: ReportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  // 服务端渲染时读不到 localStorage，必须在 useEffect 里补，
  // 否则 useState 初始值在 SSR / CSR 两端不一致会 hydration mismatch。
  const [generated, setGenerated] = React.useState(false);

  React.useEffect(() => {
    setGenerated(hasReport(task.id));
  }, [task.id]);

  const handleGenerate = async () => {
    if (loading || disabled) return;
    setLoading(true);
    await simulateReportGeneration();
    addReport({
      taskId: task.id,
      fileName: task.fileName,
      detectType: task.detectType,
      aiProbability: result.aiProbability,
      similarity: result.similarity,
      riskLevel: result.riskLevel,
      matchedSegments: result.matchedSegments,
      createdAt: new Date().toISOString(),
      status: "已生成",
      reportNo: result.reportNo,
    });
    setLoading(false);
    setGenerated(true);
    toast({
      title: "《AI 音乐鉴别技术意见书》已生成",
      description: `报告编号 ${result.reportNo} · 可在报告中心查看`,
      variant: "success",
    });
  };

  if (generated) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled className="gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          已生成报告
        </Button>
        <Button variant="outline" onClick={() => router.push("/?view=reports")}>
          <FileCheck2 className="h-4 w-4" />
          查看报告中心
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            toast({
              title: "Demo 环境暂不支持真实下载",
              description: `报告编号 ${result.reportNo} 已归档至报告中心`,
            })
          }
        >
          <Download className="h-4 w-4" />
          下载 PDF
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={disabled || loading}
      variant={variant === "ghost" ? "outline" : "default"}
      className="min-w-[160px]"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          报告生成中…
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          生成检测报告
        </>
      )}
    </Button>
  );
}
