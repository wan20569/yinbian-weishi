"use client";

import Link from "next/link";
import { FolderOpen, Inbox, SearchX, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyVariant =
  | "no-task"
  | "no-result"
  | "search"
  | "reports"
  | "profile"
  | "notifications";

const presets: Record<
  EmptyVariant,
  { icon: typeof Sparkles; title: string; description: string }
> = {
  "no-task": {
    icon: FolderOpen,
    title: "还没有检测任务",
    description: "上传一段音频，即可获得 AI 生成概率、抄袭相似度与片段级定位结果。",
  },
  "no-result": {
    icon: Sparkles,
    title: "未选中任务",
    description: "点击左侧任意任务卡片，这里会展示它的完整检测详情与证据链。",
  },
  search: {
    icon: SearchX,
    title: "没有匹配的任务",
    description: "试试其他关键词，或清空搜索条件查看全部记录。",
  },
  reports: {
    icon: FolderOpen,
    title: "暂无检测报告",
    description: "完成一次检测后报告将自动归档到这里",
  },
  profile: {
    icon: Sparkles,
    title: "账户信息未加载",
    description: "请稍后重试，或联系客服协助开通账户。",
  },
  notifications: {
    icon: Inbox,
    title: "暂无通知",
    description: "检测完成、风险命中与系统更新都会在这里提醒你。",
  },
};

export function EmptyState({
  variant = "no-task",
  className,
  compact = false,
  action,
  footer,
  title,
  description,
}: {
  variant?: EmptyVariant;
  className?: string;
  compact?: boolean;
  action?: "upload" | "none";
  /** 空态下方的补充操作区，例如「载入示例报告」 */
  footer?: React.ReactNode;
  /** 覆盖预设标题（通知页三个 Tab 的空态文案不同，复用同一套版式） */
  title?: string;
  description?: string;
}) {
  const preset = presets[variant];
  const Icon = preset.icon;
  const showUpload = action ?? (variant === "no-task" || variant === "reports" ? "upload" : "none");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-secondary/70">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <p className="mt-4 text-[13px] font-medium text-foreground">{title ?? preset.title}</p>
      <p className="mt-1.5 max-w-[340px] text-xs leading-5 text-muted-foreground">
        {description ?? preset.description}
      </p>
      {showUpload === "upload" ? (
        <Link href="/detect/new" className="mt-5">
          <Button size="sm">
            <Upload className="h-3.5 w-3.5" />
            上传音频
          </Button>
        </Link>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
