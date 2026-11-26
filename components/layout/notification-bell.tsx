"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";

import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { useNotificationReads } from "@/hooks/use-notification-reads";
import {
  NOTIFICATION_PANEL_LIMIT,
  listNotifications,
  notificationTimeLabel,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { unreadCount, markAllRead } = useNotificationReads();

  const all = React.useMemo(() => listNotifications(), []);
  const latest = all.slice(0, NOTIFICATION_PANEL_LIMIT);
  const hasUnread = unreadCount > 0;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      // 打开面板即视为已读：绿点消失，并把状态写进 localStorage
      if (next && unreadCount > 0) markAllRead();
    },
    [markAllRead, unreadCount]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
          aria-label={hasUnread ? `通知，${unreadCount} 条未读` : "通知"}
        >
          <Bell className="h-4 w-4 transition-transform duration-200 group-hover:scale-130" />
          {hasUnread && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        ref={panelRef}
        align="end"
        sideOffset={8}
        tabIndex={-1}
        className="w-[352px] p-0"
        /**
         * Radix 默认把焦点交给面板内第一个可聚焦元素（也就是「全部已读」），
         * 会露出浏览器默认的橙色 focus outline，而且一打开就可能被误触回车。
         * 改为聚焦面板容器本身：焦点仍在面板内（Esc 与 Tab 正常），但不会误聚焦按钮。
         */
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          panelRef.current?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-medium text-foreground">通知中心</h2>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              共 {all.length} 条
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (unreadCount === 0) {
                toast({ title: "没有未读通知" });
                return;
              }
              markAllRead();
              toast({ title: "已全部标记为已读" });
            }}
            className="flex items-center gap-1 rounded text-[11px] text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-1 focus-visible:ring-ring"
          >
            <CheckCheck className="h-3 w-3" />
            全部已读
          </button>
        </div>

        {/* 4 条 × 约 82px ≈ 328px，留 12px 余量，保证默认不出现「半行被切」的观感；
            超出时（文案变长 / 字号放大）才进入滚动 */}
        <div className="thin-scrollbar max-h-[340px] overflow-y-auto">
          {latest.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex gap-2.5 px-4 py-3 transition-colors hover:bg-secondary/60",
                index > 0 && "border-t border-border/60"
              )}
            >
              <NotificationTypeIcon type={item.type} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[12.5px] font-medium text-foreground">{item.title}</p>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">
                    {notificationTimeLabel(item)}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-[1.5] text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="group flex w-full items-center justify-center gap-1.5 rounded-md bg-secondary py-2 text-[11.5px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            查看全部通知
            <span className="text-[10.5px] text-muted-foreground/70">({all.length})</span>
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
