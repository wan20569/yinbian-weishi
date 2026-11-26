"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCheck, ListFilter } from "lucide-react";

import { NotificationCard } from "@/components/notifications/notification-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/workbench/empty-state";
import { AuthGate } from "@/components/auth/auth-gate";
import { useNotificationReads } from "@/hooks/use-notification-reads";
import { listNotifications } from "@/lib/notifications";

type TabKey = "all" | "unread" | "system";

const EMPTY_COPY: Record<TabKey, { title: string; description: string }> = {
  all: {
    title: "暂无通知",
    description: "检测完成、风险命中与系统更新都会在这里提醒你。",
  },
  unread: {
    title: "没有未读通知",
    description: "所有消息都已读过了。打开顶栏铃铛时，面板里的消息会自动标记为已读。",
  },
  system: {
    title: "暂无系统消息",
    description: "模型升级、存证结果与配额提醒等系统公告会汇总在这里。",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isUnread, markRead, markAllRead, unreadCount } = useNotificationReads();

  const notifications = React.useMemo(() => listNotifications(), []);
  const [tab, setTab] = React.useState<TabKey>("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const visible = React.useMemo(() => {
    switch (tab) {
      case "unread":
        return notifications.filter((item) => isUnread(item.id));
      case "system":
        return notifications.filter((item) => item.category === "system");
      default:
        return notifications;
    }
  }, [tab, notifications, isUnread]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    // 展开即视为已读，状态写进 localStorage，返回工作台时铃铛绿点同步消失
    markRead(id);
  };

  return (
    <AuthGate>
      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[320px]" />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[800px] items-center gap-3 px-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="group inline-flex items-center gap-2 rounded-md text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:scale-130" />
            <span className="inline-block transition-transform duration-200 group-hover:scale-110">
              返回工作台
            </span>
          </button>

          <span className="h-4 w-px shrink-0 bg-border" />

          <h1 className="truncate text-[15px] font-medium tracking-tight text-foreground">
            通知中心
          </h1>
          {unreadCount > 0 ? (
            <span className="shrink-0 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] leading-none text-primary">
              {unreadCount} 条未读
            </span>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            全部标记为已读
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] flex-1 px-6 pb-16 pt-8">
        <p className="text-[13px] leading-6 text-muted-foreground">
          检测结论、高危片段告警与系统公告都会汇总在这里。点击任意消息可展开全文。
        </p>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TabKey)}
          className="mt-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="unread">
                未读
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-primary/15 px-1 text-[10px] leading-4 text-primary">
                    {unreadCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="system">系统消息</TabsTrigger>
            </TabsList>

            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ListFilter className="h-3 w-3" />
              共 {visible.length} 条
            </span>
          </div>

          <TabsContent value={tab} className="mt-4 space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                variant="notifications"
                title={EMPTY_COPY[tab].title}
                description={EMPTY_COPY[tab].description}
              />
            ) : (
              visible.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  unread={isUnread(item.id)}
                  expanded={expandedId === item.id}
                  onToggle={() => handleToggle(item.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </AuthGate>
  );
}
