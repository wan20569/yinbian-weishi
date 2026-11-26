import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { ComplianceNotice } from "@/components/detect/compliance-notice";
import { cn } from "@/lib/utils";

/**
 * /detect/* 通用单列外壳（蘑兔 AI 风格）：
 * 顶部返回 + 品牌 Logo，内容最大宽度居中，底部合规提示。
 */
export function DetectShell({
  children,
  maxWidth = "max-w-[880px]",
  subtitle,
  footerClassName,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  subtitle?: string;
  footerClassName?: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[320px]" />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className={cn("mx-auto flex h-16 w-full items-center justify-between px-6", maxWidth)}>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-md text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:scale-130" />
            返回工作台
          </Link>
          <BrandLogo size="sm" />
        </div>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-6 pb-16 pt-10", maxWidth)}>
        {subtitle ? (
          <p className="mb-6 text-[13px] text-muted-foreground">{subtitle}</p>
        ) : null}
        {children}
      </main>

      <footer
        className={cn(
          "mx-auto w-full px-6 pb-8 pt-4",
          maxWidth,
          footerClassName
        )}
      >
        <div className="rounded-lg border border-border/60 bg-card/60 px-4 py-3">
          <ComplianceNotice />
        </div>
      </footer>
    </div>
  );
}
