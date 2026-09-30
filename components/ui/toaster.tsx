"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { removeToast, useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const iconMap = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
} as const;

const colorMap = {
  default: "text-muted-foreground",
  success: "text-primary",
  destructive: "text-destructive",
} as const;

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[340px] flex-col gap-2">
      {toasts.map((item) => {
        const Icon = iconMap[item.variant ?? "default"];
        return (
          <div
            key={item.id}
            className="pointer-events-auto animate-fade-up rounded-xl border border-border bg-card p-4 shadow-lift"
          >
            <div className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", colorMap[item.variant ?? "default"])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-5 text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="关闭提示"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
