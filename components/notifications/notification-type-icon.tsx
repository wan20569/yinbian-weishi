"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/** 三种通知类型 → 图标 + 配色。全部走语义变量，换肤时自动跟随 */
const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-primary/12 text-primary" },
  danger: { icon: AlertTriangle, className: "bg-destructive/12 text-destructive" },
  info: { icon: Info, className: "bg-info/12 text-info" },
};

/** 通知类型图标，下拉面板与通知中心页面共用，保证两处颜色一致 */
export function NotificationTypeIcon({
  type,
  size = "sm",
  className,
}: {
  type: NotificationType;
  size?: "sm" | "md";
  className?: string;
}) {
  const style = TYPE_STYLE[type];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
        style.className,
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </span>
  );
}
