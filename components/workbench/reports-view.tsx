"use client";

import { Download, FileText } from "lucide-react";

import { EmptyState } from "@/components/workbench/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { mockReports } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

export function ReportsView({ searchTerm }: { searchTerm: string }) {
  const keyword = searchTerm.trim().toLowerCase();
  const reports = mockReports.filter(
    (item) =>
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.reportNo.toLowerCase().includes(keyword)
  );

  if (reports.length === 0) {
    return <EmptyState variant={keyword ? "search" : "reports"} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
        <span className="text-[12px] font-medium text-foreground">报告归档</span>
        <span className="text-[11px] text-muted-foreground">共 {reports.length} 份</span>
      </div>
      <div className="divide-y divide-border">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/30"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-foreground">{report.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                编号 {report.reportNo} · {report.pages} 页 · {formatDateTime(new Date(report.createdAt))}
              </p>
            </div>
            <Badge variant={report.status === "issued" ? "success" : "secondary"}>
              {report.status === "issued" ? "已出具" : "已归档"}
            </Badge>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Demo 环境暂不支持真实下载",
                  description: `报告编号 ${report.reportNo}`,
                })
              }
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="下载报告"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
