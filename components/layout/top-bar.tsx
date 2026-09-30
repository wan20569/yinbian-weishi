"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockAccount } from "@/lib/mock-data";

export interface TopBarProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function TopBar({
  title,
  search,
  onSearchChange,
  searchPlaceholder = "搜索文件名或任务编号",
}: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <h1 className="shrink-0 text-[15px] font-medium tracking-tight text-foreground">{title}</h1>

      <div className="relative ml-2 max-w-[360px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 bg-secondary/50 pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/detect/new" className="hidden lg:block">
          <button
            type="button"
            className="h-9 rounded-md border border-primary/30 bg-primary/10 px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/15"
          >
            上传音频
          </button>
        </Link>

        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="通知"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-md pl-1 pr-2 transition-colors hover:bg-secondary"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback>{mockAccount.avatarText}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{mockAccount.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound />
              个人中心
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings />
              检测偏好设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground">
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
