"use client";

import Link from "next/link";
import { AudioLines, Plus, Sparkles } from "lucide-react";

import { navItems, type WorkbenchView } from "@/components/layout/nav-config";
import { mockAccount } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  view: WorkbenchView;
  onChangeView: (view: WorkbenchView) => void;
  pendingCount: number;
}

/**
 * 侧栏（新设计语言）：品牌渐变块 + 胶囊导航 + 引擎/额度卡。
 * props 与改造前完全一致，page.tsx 的调用方式不用改。
 */
export function AppSidebar({ view, onChangeView, pendingCount }: AppSidebarProps) {
  const usedRatio = mockAccount.quotaUsed / mockAccount.quotaTotal;

  return (
    <aside className="relative z-20 flex h-full w-[236px] shrink-0 flex-col border-r border-border/60 bg-[hsl(var(--sidebar)/0.86)] px-4 py-6 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="grad-bg grid h-10 w-10 place-items-center rounded-xl shadow-[0_0_28px_-4px_hsl(var(--primary)/0.9)]">
          <AudioLines className="h-[22px] w-[22px] text-[hsl(var(--grad-ink))]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
            音辩卫士
          </span>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Audio Trace
          </span>
        </span>
      </Link>

      <nav className="mt-9 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChangeView(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] transition-colors",
                active
                  ? "border-primary/25 bg-gradient-to-r from-primary/15 via-primary/[0.06] to-transparent font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>

              {item.key === "list" && pendingCount > 0 ? (
                <span className="num rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                  {pendingCount}
                </span>
              ) : null}

              {active ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.7)]" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <Link href="/detect/new" className="mt-4 block">
        <span className="grad-bg flex h-9 items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold text-[hsl(var(--grad-ink))] transition hover:brightness-110">
          <Plus className="h-4 w-4" />
          新建检测
        </span>
      </Link>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] font-medium text-foreground">引擎在线</span>
            <span className="num ml-auto text-[10px] text-muted-foreground">v2.4.1</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="grad-bar h-1 w-[92%] rounded-full" />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">18 类生成器指纹已加载</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              本月已用
            </span>
            <span className="num text-foreground/80">
              {mockAccount.quotaUsed} / {mockAccount.quotaTotal}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  usedRatio * 3 > index + 0.34 ? "grad-bg" : "bg-secondary"
                )}
              />
            ))}
          </div>
        </div>

        <p className="px-2 text-[10px] leading-4 text-muted-foreground/70">
          文件仅用于本次分析 · 24h 自动删除
        </p>
      </div>
    </aside>
  );
}
