import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export function ComplianceNotice({
  className,
  text = "检测报告仅为技术参考，不等同司法鉴定意见，不构成法律证据效力。",
}: {
  className?: string;
  text?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-[11px] leading-5 text-muted-foreground/80",
        className
      )}
    >
      <ShieldAlert className="mt-[3px] h-3.5 w-3.5 shrink-0 text-warn/70" />
      <span>{text}</span>
    </p>
  );
}
