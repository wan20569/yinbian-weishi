"use client";

import { Copy, Shield, Sparkles } from "lucide-react";

import type { DetectType, DetectTypeOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap = {
  sparkles: Sparkles,
  copy: Copy,
  shield: Shield,
} as const;

export function DetectTypeSelector({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: DetectTypeOption[];
  value: DetectType;
  onChange: (value: DetectType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const Icon = iconMap[option.icon];
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative rounded-xl border p-4 text-left transition-all duration-200",
              active
                ? "border-primary/55 bg-primary/[0.08] ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/40",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg border",
                  active
                    ? "border-primary/35 bg-primary/12 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-130" />
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                )}
              >
                {option.tag}
              </span>
            </div>
            <p
              className={cn(
                "mt-3 text-[13px] font-medium",
                active ? "text-foreground" : "text-foreground/90"
              )}
            >
              {option.title}
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
