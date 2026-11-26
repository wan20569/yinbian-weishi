"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Gauge,
  LogOut,
  Mail,
  Music2,
  Palette,
  PencilLine,
} from "lucide-react";
import { useTheme } from "next-themes";

import { EditProfileDialog } from "@/components/auth/edit-profile-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { signOut, useAuth } from "@/lib/cloud-auth";
import { THEME_OPTIONS } from "@/lib/theme-config";
import { cn } from "@/lib/utils";

function ThemeSwatch({
  option,
  active,
  onSelect,
}: {
  option: (typeof THEME_OPTIONS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const { preview } = option;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative rounded-xl border p-2 text-left transition-all duration-200",
        active
          ? "border-primary ring-1 ring-primary/40"
          : "border-border hover:border-primary/45 hover:bg-secondary/40"
      )}
    >
      {/* 迷你界面预览：用该主题的真实色值画出结构，一眼能看出冷暖差异 */}
      <div
        className="relative h-[64px] w-full overflow-hidden rounded-lg"
        style={{ backgroundColor: preview.background }}
      >
        <div
          className="absolute left-2 top-2 h-[3px] w-7 rounded-full"
          style={{ backgroundColor: preview.primary }}
        />
        <div
          className="absolute left-2 top-[14px] h-[28px] w-[46%] rounded-[5px] border"
          style={{ backgroundColor: preview.card, borderColor: preview.border }}
        />
        <div
          className="absolute right-2 top-[14px] h-[28px] w-[38%] rounded-[5px] border"
          style={{ backgroundColor: preview.card, borderColor: preview.border }}
        />
        <div
          className="absolute bottom-2 left-2 h-[3px] w-[55%] rounded-full"
          style={{ backgroundColor: preview.muted }}
        />
      </div>

      {active ? (
        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-foreground">{option.label}</span>
        <span className={cn("text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
          {option.hint}
        </span>
      </div>
    </button>
  );
}

export function ProfileView() {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // next-themes 在挂载前读不到当前主题，先渲染空选中态再对齐，避免 hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 编辑个人信息弹窗
  const [editOpen, setEditOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "已退出登录", description: "报告数据已安全保存在云端账号中" });
  };

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2">
        {loading ? (
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-secondary" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-48 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <UserAvatar
              className="h-16 w-16"
              name={user?.name}
              email={user?.email}
              avatarPath={user?.avatarPath ?? null}
              avatarUrl={user?.avatarUrl ?? null}
            />
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[14px] font-medium text-foreground">
                <span className="truncate">{user?.name ?? "已登录"}</span>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                <Badge variant="success">已登录</Badge>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="编辑个人信息"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </button>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{user?.email ?? "已通过邮箱登录"}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                支持 JPG / PNG，建议方形图片，自动压缩至 512×512。
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleSignOut()}>
                <LogOut className="mr-1 h-3.5 w-3.5" />
                退出登录
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <PencilLine className="mr-1 h-3.5 w-3.5" />
                编辑
              </Button>
            </div>
          </div>
        )}

        <Separator className="my-5" />

        <div className="space-y-3">
          {[
            { icon: CalendarDays, label: "注册时间", value: "登录后同步" },
            { icon: Music2, label: "身份类型", value: "独立音乐人 / 创作者" },
            { icon: Mail, label: "联系邮箱", value: user?.email ?? "登录后同步" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="w-20 text-[11px] text-muted-foreground">{item.label}</span>
                <span className="text-[12px] text-foreground">{item.value}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <Gauge className="h-3.5 w-3.5 text-primary" />
          用量概览
        </div>
        <p className="mt-4 text-[26px] font-medium leading-none text-foreground">
          <span className="text-[12px] font-normal text-muted-foreground">本月检测</span>
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-0 rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          检测额度与用量统计将在报告云端化后接入，当前以真实检测记录为准。
        </p>
        <Separator className="my-4" />
        <div className="space-y-2 text-[11px] text-muted-foreground">
          <p>· 检测报告将自动云端同步</p>
          <p>· 资料与头像按账号隔离，仅本人可见</p>
          <p>· 支持下一步：开通企业 API 服务</p>
        </div>
      </Card>

      <Card className="p-5 xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Palette className="h-3.5 w-3.5 text-primary" />
            外观设置
          </div>
          <span className="text-[11px] text-muted-foreground">
            切换即时生效，选择会保存在本机，刷新后仍然保留
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEME_OPTIONS.map((option) => (
            <ThemeSwatch
              key={option.value}
              option={option}
              active={mounted && theme === option.value}
              onSelect={() => setTheme(option.value)}
            />
          ))}
        </div>

        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          主题只改变界面配色，不影响检测结果、报告数据与已有任务状态。
        </p>
      </Card>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
