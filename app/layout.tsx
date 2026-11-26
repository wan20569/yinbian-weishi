import type { Metadata } from "next";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { DEFAULT_THEME, THEME_VALUES } from "@/lib/theme-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "音辩卫士 · AI 音乐鉴别与版权溯源平台",
  description:
    "面向创作者、平台与版权机构的 AI 音乐鉴别、片段级抄袭检测与标准化报告存证一体化平台。",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme={DEFAULT_THEME}
          enableSystem={false}
          disableTransitionOnChange
          themes={THEME_VALUES}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
