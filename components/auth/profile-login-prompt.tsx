"use client";

import * as React from "react";
import { Lock, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoginGate } from "@/components/auth/login-gate";

/**
 * 个人中心「未登录」提示卡。
 *
 * 工作台整体已不再设登录墙，但「个人中心」视图需要登录才能看账户资料。
 * 这里不用整页 LoginGate 直接拦截（会盖住整个工作台），而是先给一张内嵌
 * 提示卡说明「登录后可见账户与报告」，用户主动点「登录」才弹出整页登录墙。
 * 登录成功后 useAuth 的 onAuthStateChange 会刷新 user，本组件随之消失、显示真实资料。
 */
export function ProfileLoginPrompt() {
  const [showGate, setShowGate] = React.useState(false);

  if (showGate) {
    return <LoginGate onSuccess={() => setShowGate(false)} />;
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-secondary/70">
        <Lock className="h-5 w-5 text-primary" />
      </span>
      <p className="mt-4 text-[13px] font-medium text-foreground">登录后查看个人中心</p>
      <p className="mt-1.5 max-w-[340px] text-xs leading-5 text-muted-foreground">
        登录后可管理头像与昵称、查看云端同步的检测报告与存证记录。
      </p>
      <Button className="mt-5" size="sm" onClick={() => setShowGate(true)}>
        <LogIn className="h-3.5 w-3.5" />
        登录
      </Button>
    </div>
  );
}
