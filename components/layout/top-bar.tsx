"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogIn, LogOut, PencilLine, RefreshCw, Search, Settings, UserRound } from "lucide-react";

import { EditProfileDialog } from "@/components/auth/edit-profile-dialog";
import { LoginGate } from "@/components/auth/login-gate";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { WorkbenchView } from "@/components/layout/nav-config";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { signOut, useAuth } from "@/lib/cloud-auth";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** 当前工作台视图：用于「个人中心」的选中态与重复点击判断 */
  currentView?: WorkbenchView;
}

export function TopBar({
  title,
  search,
  onSearchChange,
  searchPlaceholder = "搜索文件名或任务编号",
  currentView,
}: TopBarProps) {
  const router = useRouter();
  const onProfile = currentView === "profile";
  const { user, loading, initError, retry } = useAuth();
  const [editOpen, setEditOpen] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);

  const displayName = user?.name || "已登录";
  const displayEmail = user?.email ?? "";
  // 登录态加载中：先不渲染账户菜单，避免「登录按钮」和「账户菜单」之间闪跳
  // initError（token 接口 502/超时）时也不渲染「登录」入口，避免误伤已登录用户
  const authReady = !loading && !initError;

  const goProfile = () => {
    // 菜单项被选中时 Radix 会自动关闭下拉，无需手动控制开关。
    // 已经在个人中心时不再重复导航，避免把同一条记录推进历史栈。
    if (onProfile) return;
    router.push("/?view=profile");
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "已退出登录", description: "报告数据已安全保存在云端账号中" });
  };

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
      <div className="shrink-0">
        <span className="block text-[9px] uppercase leading-none tracking-[0.22em] text-muted-foreground">
          Workspace
        </span>
        <h1 className="mt-1 text-[14px] font-medium leading-none tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="group relative ml-2 max-w-[360px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-hover:scale-130 group-focus-within:scale-130" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 rounded-xl border-border/60 bg-secondary/40 pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/detect/new" className="hidden lg:block">
          <button
            type="button"
            className="h-9 rounded-xl border border-primary/30 bg-primary/10 px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/15"
          >
            上传音频
          </button>
        </Link>

        <NotificationBell />

        {authReady ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="账户菜单"
              className="group flex h-9 items-center gap-2 rounded-xl pl-1 pr-2 transition-colors hover:bg-secondary/60 data-[state=open]:bg-secondary/60"
            >
              {user ? (
                <UserAvatar
                  className="h-7 w-7 transition-transform duration-200 group-hover:scale-130"
                  name={user.name}
                  email={user.email}
                  avatarPath={user.avatarPath ?? null}
                  avatarUrl={user.avatarUrl ?? null}
                />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:scale-130" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {user ? (
              <>
                <DropdownMenuLabel className="py-2">
                  <span className="block truncate text-[12px] text-foreground">{displayName}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {displayEmail || "已登录"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <PencilLine />
                  编辑个人信息
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={goProfile}
                  className={cn(onProfile && "text-primary")}
                >
                  <UserRound />
                  个人中心
                  {onProfile ? (
                    <span className="ml-auto text-[10px] text-primary/80">当前</span>
                  ) : null}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => toast({ title: "功能开发中", description: "检测偏好设置暂未开放" })}
                >
                  <Settings />
                  检测偏好设置
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-muted-foreground" onSelect={handleSignOut}>
                  <LogOut />
                  退出登录
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => setLoginOpen(true)}>
                <LogIn />
                登录
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
          </DropdownMenu>
        ) : initError ? (
          <button
            type="button"
            onClick={() => void retry()}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2 text-[12px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            title={initError}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重试
          </button>
        ) : null}
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      {loginOpen ? <LoginGate onSuccess={() => setLoginOpen(false)} /> : null}
    </header>
  );
}
