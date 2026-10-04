"use client";

import { Disc3, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { fillDemoBullets, type DemoScriptCard } from "@/lib/demo-script";
import type { MatchedSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 演示脚本卡片。
 * 第 1 次检测 -> 曲库溯源 · 原创作品识别（主色）
 * 第 2 次检测 -> AI 生成特征识别（危险色）
 * 第 3 次起不渲染（getDemoCard 返回 null）
 */
export function DemoScriptCardView({
  card,
  segments,
}: {
  card: DemoScriptCard;
  segments: MatchedSegment[];
}) {
  const danger = card.tone === "danger";
  const bullets = fillDemoBullets(card.bullets ?? [], segments);

  return (
    <div
      className={cn(
        "animate-fade-up rounded-xl border p-5",
        danger
          ? "border-danger/25 bg-danger/[0.06]"
          : "border-brand/25 bg-brand/[0.06]"
      )}
    >
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "flex items-center gap-2 text-[13px] font-medium",
            danger ? "text-danger" : "text-brand"
          )}
        >
          {danger ? (
            <ShieldAlert className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {card.title}
        </p>
        <span className="shrink-0 text-[11px] text-muted-foreground">{card.aside}</span>
      </div>

      {/* 徽章 */}
      <div className="mt-3">
        <Badge
          variant={danger ? "destructive" : "success"}
          className="px-2.5 py-1 font-normal"
        >
          {card.badge}
        </Badge>
      </div>

      {/* 曲库溯源信息（仅第 1 次） */}
      {card.track ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-card/70 p-4">
          {card.bridge ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Disc3 className="h-3 w-3" />
              {card.bridge}
            </p>
          ) : null}
          <p className="mt-1.5 text-[16px] font-medium text-foreground">{card.track.name}</p>
          <div className="mt-2.5 grid gap-1.5 text-[12px] sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-muted-foreground">演唱者</span>
              <span className="text-foreground">{card.track.artist}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-muted-foreground">发行信息</span>
              <span className="text-foreground">{card.track.release}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 结论 */}
      <p className="mt-4 text-[12px] leading-6 text-muted-foreground">{card.message}</p>

      {/* 要点 */}
      {bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"
            >
              <span
                className={cn(
                  "mt-[6px] h-1 w-1 shrink-0 rounded-full",
                  danger ? "bg-danger" : "bg-brand"
                )}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
