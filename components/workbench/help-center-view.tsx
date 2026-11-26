"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Lightbulb,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  FAQ_UPDATED_AT,
  type FaqCategory,
  type FaqItem,
} from "@/lib/faq-data";
import { cn } from "@/lib/utils";

export interface HelpCenterViewProps {
  /** 与顶栏搜索共用同一份状态：两处输入框过滤的是同一个列表 */
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

/**
 * 帮助中心（设计稿 FAQ 页的深色适配版）。
 * 视觉全部走主题令牌，四套皮肤自动跟随；
 * 交互保持纯前端：关键词过滤 + 分类胶囊 + 手风琴展开。
 */
export function HelpCenterView({ searchTerm, onSearchChange }: HelpCenterViewProps) {
  const [category, setCategory] = React.useState<FaqCategory>("all");
  const [openIds, setOpenIds] = React.useState<string[]>([]);
  const listRef = React.useRef<HTMLDivElement>(null);

  const keyword = searchTerm.trim().toLowerCase();

  const filtered = React.useMemo(
    () =>
      FAQ_ITEMS.filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (!keyword) return true;
        const haystack = [item.tag, item.question, item.answer, ...item.keywords]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      }),
    [category, keyword]
  );

  const isFiltered = keyword.length > 0 || category !== "all";

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const resetFilters = () => {
    setCategory("all");
    onSearchChange("");
  };

  /** 侧栏「检测原理与局限性」→ 切到原理分类并滚到列表，不新开页面 */
  const jumpToPrinciple = () => {
    setCategory("principle");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-0">
      {/* 页头 HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-secondary/[0.12] px-5 py-6 sm:px-8 sm:py-8">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full blur-[100px]"
          style={{ backgroundColor: "hsl(var(--glow-b) / calc(var(--glow-alpha) * 0.8))" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full blur-[100px]"
          style={{ backgroundColor: "hsl(var(--glow-a) / calc(var(--glow-alpha) * 0.45))" }}
        />

        <div className="relative grid gap-7 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="eyebrow flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Help center / 帮助中心
            </div>
            <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              常见问题与帮助
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-[12.5px] leading-7 text-muted-foreground">
              关于检测原理、结果解读、文件隐私与使用额度的{" "}
              <span className="num text-foreground">{FAQ_ITEMS.length}</span>{" "}
              个高频问题。没有找到答案？页面下方有联系方式。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CircleHelp className="h-3.5 w-3.5 text-primary" />
                <span className="num">{FAQ_ITEMS.length}</span> 个问题
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                平均 2 小时响应
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70" />
                文档更新 <span className="num">{FAQ_UPDATED_AT}</span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <label
              htmlFor="faq-search"
              className="mb-1.5 block text-[11px] font-medium text-muted-foreground"
            >
              搜索帮助文档
            </label>
            <div className="group relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-hover:scale-125 group-focus-within:scale-125" />
              <input
                id="faq-search"
                type="search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="例如：置信度、删除文件、批量"
                className="h-11 w-full rounded-xl border border-border/60 bg-background/60 pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              支持中文关键词，输入后实时过滤下方问题
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          {FAQ_CATEGORIES.map((tab) => {
            const active = category === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border/70 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* 问题列表 */}
        <div ref={listRef} className="scroll-mt-4 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              {isFiltered ? (
                <>
                  匹配 <span className="num text-foreground">{filtered.length}</span> /{" "}
                  <span className="num">{FAQ_ITEMS.length}</span> 个问题
                </>
              ) : (
                <>
                  共 <span className="num text-foreground">{FAQ_ITEMS.length}</span> 个问题
                </>
              )}
            </p>
            <p className="hidden text-[11px] text-muted-foreground/70 sm:block">点击问题展开答案</p>
          </div>

          <div className="space-y-2.5">
            {filtered.map((item) => (
              <FaqRow
                key={item.id}
                item={item}
                open={openIds.includes(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/10 px-6 py-12 text-center">
              <CircleHelp className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-[13px] font-medium text-foreground">没有找到相关问题</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                试试更短的关键词，或切换到「全部」分类。
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12px] font-medium text-background transition hover:opacity-85"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                清除筛选
              </button>
            </div>
          ) : null}
        </div>

        {/* 侧栏 */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-[13px] font-semibold text-foreground">隐私与文件处理</h3>
            </div>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-5 text-muted-foreground">
              {[
                "文件仅用于当次分析，24 小时内自动删除",
                "上传与下载全程 TLS 1.3 加密",
                "对象存储 AES-256 静态加密",
                "用户音频默认不进入训练集",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/?view=reports"
              className="group mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-[12px] font-medium text-foreground/90 transition-colors hover:border-primary/45 hover:text-primary"
            >
              前往报告页管理文件
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="panel p-5">
            <h3 className="text-[13px] font-semibold text-foreground">需要更多帮助？</h3>
            <p className="mt-1.5 text-[12px] leading-6 text-muted-foreground">
              如果问题不在列表中，可以通过邮件联系人工支持，并附上报告编号。
            </p>
            <div className="mt-3 rounded-lg border border-border/60 bg-secondary/20 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                支持邮箱
              </p>
              <p className="num mt-1 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" />
                support@yinjia.ai
              </p>
            </div>
            <dl className="mt-3 space-y-2 text-[12px]">
              {[
                ["响应时间", "平均 2 小时"],
                ["服务时段", "工作日 10:00–19:00"],
                ["适用版本", "v2.4.1"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="num text-foreground/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel p-5">
            <h3 className="text-[13px] font-semibold text-foreground">快捷入口</h3>
            <ul className="mt-3 space-y-2.5 text-[12px]">
              <li>
                <Link
                  href="/detect/new"
                  className="group flex items-center justify-between gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    上传音频开始检测
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-125" />
                </Link>
              </li>
              <li>
                <Link
                  href="/?view=reports"
                  className="group flex items-center justify-between gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    查看示例报告
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-125" />
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={jumpToPrinciple}
                  className="group flex w-full items-center justify-between gap-2 text-left text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CircleHelp className="h-3.5 w-3.5" />
                    检测原理与局限性
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-125" />
                </button>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-5">
            <div className="flex gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-[12px] font-semibold text-foreground">读报告的小建议</p>
                <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
                  先看置信区间是否足够窄，再看分段判定是否连续异常，最后再看具体概率数字。
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 页脚 */}
      <div className="mt-8 border-t border-border/60 pt-6">
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grad-bg grid h-8 w-8 place-items-center rounded-lg">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--grad-ink))]" />
              </span>
              <span className="text-[14px] font-semibold text-foreground">音辩卫士</span>
            </div>
            <p className="mt-3 max-w-xs text-[11.5px] leading-6 text-muted-foreground">
              面向创作者与普通用户的 AI 音乐检测工具。上传音频，获得可读的概率、证据与结论。
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              所有系统运行正常
            </div>
          </div>

          <div>
            <p className="eyebrow">产品</p>
            <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
              <li>
                <Link href="/" className="transition-colors hover:text-primary">
                  工作台
                </Link>
              </li>
              <li>
                <Link href="/?view=list" className="transition-colors hover:text-primary">
                  检测中心
                </Link>
              </li>
              <li>
                <Link href="/?view=reports" className="transition-colors hover:text-primary">
                  报告中心
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">资源</p>
            <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
              <li>
                <button
                  type="button"
                  onClick={() => setCategory("privacy")}
                  className="transition-colors hover:text-primary"
                >
                  隐私与文件处理
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCategory("result")}
                  className="transition-colors hover:text-primary"
                >
                  结果解读指南
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCategory("account")}
                  className="transition-colors hover:text-primary"
                >
                  使用与额度
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">引擎</p>
            <dl className="mt-3 space-y-2 text-[12px] text-muted-foreground">
              {[
                ["模型版本", "v2.4.1"],
                ["覆盖生成器", "18 类"],
                ["平均分析", "23s"],
                ["最近更新", "2026-09-30"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt>{label}</dt>
                  <dd className="num text-foreground/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border/50 pt-4 text-[10px] text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 音辩卫士 · 检测结果基于统计模型，仅供参考，不构成法律或版权裁决依据。</p>
          <p className="num">FILES AUTO-DELETE 24H</p>
        </div>
      </div>
    </div>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors duration-200",
        open
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/60 bg-secondary/[0.12] hover:border-border"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded border border-border/70 bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {item.tag}
          </span>
          <span className="text-[13px] font-medium leading-6 text-foreground">{item.question}</span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 transition-transform duration-200",
            open ? "rotate-180 text-primary" : "text-muted-foreground"
          )}
        />
      </button>

      {open ? (
        <div className="animate-in fade-in slide-in-from-top-1 px-4 pb-4 text-[12.5px] leading-7 text-muted-foreground duration-200 sm:px-5 sm:pl-[4.15rem]">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
}
