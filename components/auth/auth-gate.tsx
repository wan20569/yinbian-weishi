"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { LoginGate } from "@/components/auth/login-gate";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/cloud-auth";

/**
 * 登录守卫（入口级渲染开关）。
 *
 * 未登录用户只看到登录页，登录后渲染 children（完整工作台）。
 * 这是「体验层」的入口门：数据隔离由 RLS + Storage 策略在服务端强制，
 * 与本守卫是否存在无关——即使绕过本页直接调数据接口也拿不到别人的报告。
 *
 * loading 期间渲染占位，避免「登录墙闪一下又变回工作台」的 hydration 竞态。
 * initError（token 接口 502/超时等临时故障）时渲染「重试」而不是登录墙，
 * 避免把已登录用户误判成未登录。
 */
export function AuthGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  /** 未登录时渲染的内容；缺省为整页 LoginGate 登录墙 */
  fallback?: React.ReactNode;
}) {
  const { user, loading, initError, retry } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-background text-[13px] text-muted-foreground">
        正在加载工作台…
      </div>
    );
  }

  if (initError) {
    return (
      <div className="grid h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[13px] text-muted-foreground">{initError}</p>
          <Button size="sm" variant="outline" onClick={() => void retry()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{fallback ?? <LoginGate />}</>;
  }

  return <>{children}</>;
}
