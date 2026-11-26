"use client";

import { ChevronDown } from "lucide-react";

import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import { notificationTimeLabel, type NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * 通知卡片：折叠态展示摘要，点击展开全文。
 * 展开动作由父级控制（同时会触发「标记已读」），这里只负责渲染。
 */
export function NotificationCard({
  item,
  unread,
  expanded,
  onToggle,
}: {
  item: NotificationItem;
  unread: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "group block w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-200",
        unread
          ? "border-primary/30 bg-primary/[0.045] hover:border-primary/45"
          : "border-border bg-card/60 hover:border-primary/35 hover:bg-card/90",
        expanded && "border-primary/45 bg-card/95 shadow-subtle"
      )}
    >
      <div className="flex items-start gap-3">
        <NotificationTypeIcon type={item.type} size="md" className="mt-0.5" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
            {unread ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                <span className="h-1 w-1 rounded-full bg-primary" />
                未读
              </span>
            ) : null}
            <span className="ml-auto shrink-0 text-[10.5px] text-muted-foreground">
              {notificationTimeLabel(item)}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </div>

          <p
            className={cn(
              "mt-1.5 text-[12px] leading-[1.65] text-muted-foreground",
              !expanded && "line-clamp-2"
            )}
          >
            {item.description}
          </p>

          {expanded ? (
            <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3">
              {item.detail.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-[12px] leading-[1.75] text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
