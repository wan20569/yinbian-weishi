"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  Sparkles,
  Trash2,
  Eraser,
} from "lucide-react";

import { EmptyState } from "@/components/workbench/empty-state";
import { RiskBadge } from "@/components/detect/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { detectTypeLabel } from "@/lib/mock-data";
import {
  addReport,
  clearReports,
  getReports,
  removeReport,
  subscribeReports,
  type ReportItem,
} from "@/lib/report-store";
import { sampleReports } from "@/lib/sample-reports";
import { formatDateTime } from "@/lib/utils";

export function ReportsView({ searchTerm }: { searchTerm: string }) {
  const router = useRouter();
  const [reports, setReports] = React.useState<ReportItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const refresh = React.useCallback(() => {
    setReports(getReports());
  }, []);

  React.useEffect(() => {
    refresh();
    setHydrated(true);
    return subscribeReports(refresh);
  }, [refresh]);

  const handleClear = () => {
    clearReports();
    toast({ title: "报告中心已清空", description: "本地归档记录已全部删除" });
  };

  const handleLoadSamples = () => {
    sampleReports.forEach((item) => addReport(item));
    toast({
      title: "已载入示例报告",
      description: `共 ${sampleReports.length} 份，演示数据仅供展示`,
    });
  };

  const openTask = (report: ReportItem) => {
    const query = new URLSearchParams({
      name: report.fileName,
      type: report.detectType,
    });
    router.push(`/detect/${report.taskId}?${query.toString()}`);
  };

  // 首帧未 hydrate 时先给骨架，避免「有数据却闪一下空态」
  if (!hydrated) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <Skeleton className="h-[96px] w-full rounded-xl" />
        <Skeleton className="h-[96px] w-full rounded-xl" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        variant="reports"
        footer={
          <button
            type="button"
            onClick={handleLoadSamples}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            载入示例报告（演示用）
          </button>
        }
      />
    );
  }

  const keyword = searchTerm.trim().toLowerCase();
  const filtered = reports.filter(
    (item) =>
      !keyword ||
      item.fileName.toLowerCase().includes(keyword) ||
      item.reportNo.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    return <EmptyState variant="search" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
        <span className="text-[12px] font-medium text-foreground">报告归档</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">共 {filtered.length} 份</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            <Eraser className="h-3.5 w-3.5" />
            清空
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((report) => (
          <div
            key={report.taskId}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/30"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
              <FileText className="h-4 w-4" />
            </span>

            <button
              type="button"
              onClick={() => openTask(report)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[12px] text-foreground transition-colors group-hover:text-primary">
                《{report.fileName.replace(/\.[^.]+$/, "")}》AI 音乐鉴别技术意见书
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                <span>{detectTypeLabel[report.detectType] ?? report.detectType}</span>
                <span>
                  AI {report.aiProbability.toFixed(1)}% · 相似度{" "}
                  {report.similarity.toFixed(1)}%
                </span>
                <span>{formatDateTime(new Date(report.createdAt))}</span>
              </p>
            </button>

            <RiskBadge level={report.riskLevel} />
            <Badge variant="secondary" className="shrink-0">
              {report.status}
            </Badge>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => openTask(report)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                aria-label="查看检测详情"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  removeReport(report.taskId);
                  toast({ title: "报告已删除", description: report.reportNo });
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="删除报告"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
