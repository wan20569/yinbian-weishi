"use client";

import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { navItems, type WorkbenchView } from "@/components/layout/nav-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { mockAccount } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  view: WorkbenchView;
  onChangeView: (view: WorkbenchView) => void;
  pendingCount: number;
}

export function AppSidebar({ view, onChangeView, pendingCount }: AppSidebarProps) {
  const quotaLeft = mockAccount.quotaTotal - mockAccount.quotaUsed;

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-[#0D1219]">
      <div className="flex h-16 items-center px-5">
        <BrandLogo />
      </div>

      <div className="px-4 pb-3">
        <Link href="/detect/new" className="block">
          <Button className="w-full" size="default">
            <Plus className="h-4 w-4" />
            新建检测
          </Button>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3 pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChangeView(item.key)}
              className={cn(
                "group flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === "list" && pendingCount > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <Separator className="my-4 bg-border/70" />

      <div className="px-4">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[12px] font-medium">检测额度</span>
          </div>
          <div className="mt-2.5 flex items-end justify-between">
            <span className="text-[18px] font-medium leading-none text-foreground">
              {quotaLeft}
            </span>
            <span className="text-[11px] text-muted-foreground">/ {mockAccount.quotaTotal} 次</span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(mockAccount.quotaUsed / mockAccount.quotaTotal) * 100}%` }}
            />
          </div>
          <Badge variant="secondary" className="mt-3 w-full justify-center py-1">
            {mockAccount.plan} · 剩余 30 天
          </Badge>
        </div>
      </div>

      <div className="mt-auto px-4 pb-5 pt-4">
        <p className="text-[10px] leading-4 text-muted-foreground/70">
          AI 音乐鉴别与版权溯源平台
          <br />
          检测 → 报告 → 存证 一体化闭环
        </p>
      </div>
    </aside>
  );
}
