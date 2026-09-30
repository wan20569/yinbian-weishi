import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandLogo({
  size = "md",
  className,
  href,
}: {
  size?: "sm" | "md";
  className?: string;
  href?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-[10px] bg-primary/12 ring-1 ring-primary/25",
          size === "sm" ? "h-7 w-7" : "h-9 w-9"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className={cn("text-primary", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 14v-2" />
          <path d="M8 18V8" />
          <path d="M12 20V5" />
          <path d="M16 16v-6" />
          <path d="M20 12V9" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-medium tracking-tight text-foreground",
            size === "sm" ? "text-[14px]" : "text-[16px]"
          )}
        >
          音辩卫士
        </span>
        <span className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground">
          AUDIO TRACE
        </span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-85">
        {content}
      </Link>
    );
  }
  return content;
}
