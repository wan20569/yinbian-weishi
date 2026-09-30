"use client";

import { Disc3, Music4 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MatchedSegment } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

export function MatchedSegments({ segments }: { segments: MatchedSegment[] }) {
  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
        <p className="text-[13px] text-foreground">未检出匹配片段</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          指纹库与旋律特征库均无显著命中，原创性良好。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {segments.map((segment) => {
        const high = segment.similarity >= 70;
        const mid = segment.similarity >= 40;
        const Icon = segment.source === "fingerprint" ? Disc3 : Music4;
        return (
          <div
            key={segment.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/35"
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                high
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : mid
                    ? "border-warn/25 bg-warn/10 text-warn"
                    : "border-border bg-secondary text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium tabular-nums text-foreground">
                  {formatClock(segment.start)} - {formatClock(segment.end)}
                </span>
                <Badge variant={high ? "destructive" : mid ? "warning" : "secondary"}>
                  {segment.similarity.toFixed(1)}%
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {segment.source === "fingerprint" ? "指纹库命中" : "旋律特征命中"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                疑似来源：{segment.sourceTitle} · {segment.sourceArtist}
              </p>
            </div>

            <div className="hidden w-24 shrink-0 sm:block">
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full",
                    high ? "bg-destructive" : mid ? "bg-warn" : "bg-muted-foreground"
                  )}
                  style={{ width: `${segment.similarity}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
