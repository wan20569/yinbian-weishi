"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileCheck2, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { simulateReportGeneration } from "@/lib/mock-service";

export interface ReportButtonProps {
  taskId: string;
  reportNo: string;
  disabled?: boolean;
  variant?: "solid" | "ghost";
}

export function ReportButton({
  taskId,
  reportNo,
  disabled = false,
  variant = "solid",
}: ReportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const handleGenerate = async () => {
    if (loading || disabled) return;
    setLoading(true);
    const result = await simulateReportGeneration();
    setLoading(false);
    setGenerated(true);
    toast({
      title: "《AI 音乐鉴别技术意见书》已生成",
      description: `报告编号 ${result.reportNo} · 可在报告中心查看与归档`,
      variant: "success",
    });
    router.push("/?view=reports");
  };

  if (generated) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => router.push("/?view=reports")}>
          <FileCheck2 className="h-4 w-4" />
          前往报告中心
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            toast({
              title: "Demo 环境暂不支持真实下载",
              description: `报告编号 ${reportNo} 已归档至报告中心`,
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
