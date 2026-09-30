import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RiskLevel, TaskStatus } from "@/lib/types";

export const statusMeta: Record<
  TaskStatus,
  { label: string; icon: typeof Clock; className: string; dot: string }
> = {
  queued: {
    label: "排队中",
    icon: Clock,
    className: "border-border bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  analyzing: {
    label: "检测中",
    icon: Loader2,
    className: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  done: {
    label: "已完成",
    icon: CheckCircle2,
    className: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  failed: {
    label: "检测失败",
    icon: AlertTriangle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

export const riskMeta: Record<RiskLevel, { label: string; text: string; bg: string }> = {
  low: { label: "低风险", text: "text-primary", bg: "bg-primary" },
  medium: { label: "中风险", text: "text-warn", bg: "bg-warn" },
  high: { label: "高风险", text: "text-destructive", bg: "bg-destructive" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      <Icon
        className={`h-3 w-3 ${status === "analyzing" ? "animate-spin" : ""}`}
        strokeWidth={2.2}
      />
      {meta.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const meta = riskMeta[level];
  return (
    <Badge variant={level === "low" ? "success" : level === "medium" ? "warning" : "destructive"}>
      {meta.label}
    </Badge>
  );
}
