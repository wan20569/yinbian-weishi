"use client";

import { BadgeCheck, CalendarDays, Mail, Music2, Palette } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockAccount } from "@/lib/mock-data";

export function ProfileView() {
  const usedPercent = (mockAccount.quotaUsed / mockAccount.quotaTotal) * 100;

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-[14px]">{mockAccount.avatarText}</AvatarFallback>
          </Avatar>
          <div>
            <p className="flex items-center gap-2 text-[14px] font-medium text-foreground">
              {mockAccount.name}
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{mockAccount.email}</p>
          </div>
          <Badge variant="success" className="ml-auto">
            {mockAccount.plan}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          {[
            { icon: CalendarDays, label: "注册时间", value: mockAccount.joinedAt },
            { icon: Music2, label: "身份类型", value: "独立音乐人 / 创作者" },
            { icon: Mail, label: "联系邮箱", value: mockAccount.email },
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
          <Palette className="h-3.5 w-3.5 text-primary" />
          用量概览
        </div>
        <p className="mt-4 text-[26px] font-medium leading-none text-foreground">
          {mockAccount.quotaUsed}
          <span className="ml-1 text-[12px] font-normal text-muted-foreground">
            / {mockAccount.quotaTotal} 次
          </span>
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          额度将于 2026-10-30 重置，超出后可按需购买按量包（0.1-0.5 元/次）。
        </p>
        <Separator className="my-4" />
        <div className="space-y-2 text-[11px] text-muted-foreground">
          <p>· 已归档报告 4 份</p>
          <p>· 累计检测到匹配片段 6 处</p>
          <p>· 支持的下一步：开通企业 API 服务</p>
        </div>
      </Card>
    </div>
  );
}
