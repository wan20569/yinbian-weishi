"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { DetailPanel } from "@/components/layout/detail-panel";
import { TopBar } from "@/components/layout/top-bar";
import { type WorkbenchView } from "@/components/layout/nav-config";
import { AuroraBackground } from "@/components/workbench/aurora-background";
import { HelpCenterView } from "@/components/workbench/help-center-view";
import { ListView } from "@/components/workbench/list-view";
import { ProfileView } from "@/components/workbench/profile-view";
import { ReportsView } from "@/components/workbench/reports-view";
import { TasksView, type WorkbenchFilterKey } from "@/components/workbench/tasks-view";
import { AuthGate } from "@/components/auth/auth-gate";
import { ProfileLoginPrompt } from "@/components/auth/profile-login-prompt";
import { useToast } from "@/components/ui/use-toast";
import { handleOAuthCallback } from "@/lib/cloud-oauth";
import { listTasks } from "@/lib/mock-service";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const viewTitles: Record<WorkbenchView, string> = {
  tasks: "工作台",
  list: "检测中心",
  reports: "报告中心",
  help: "帮助中心",
  profile: "个人中心",
};

const VIEW_KEYS: WorkbenchView[] = ["tasks", "list", "reports", "help", "profile"];

/** 地址栏里的 ?view= 不可信（可能被手改成任意值），非法值一律回落到工作台 */
function parseView(value: string | null): WorkbenchView | null {
  if (!value) return null;
  return (VIEW_KEYS as string[]).includes(value) ? (value as WorkbenchView) : null;
}

/** 视图 → 地址栏，tasks 为默认视图所以不带参数 */
function viewHref(view: WorkbenchView) {
  return view === "tasks" ? "/" : `/?view=${view}`;
}

function WorkbenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const [view, setView] = React.useState<WorkbenchView>(() => parseView(viewParam) ?? "tasks");
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<WorkbenchFilterKey>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // 延迟初始化：返回工作台时能读到新注册的任务（纯前端内存态）
  const [tasks] = React.useState<Task[]>(() => listTasks());

  /**
   * URL 是视图的对外入口：顶栏「个人中心」、地址栏直达、刷新都靠这条同步。
   * 只监听 viewParam，不能把 view 放进依赖，否则侧栏切换会被 URL 覆盖回去。
   */
  React.useEffect(() => {
    const next = parseView(viewParam);
    if (!next) return;
    setView((prev) => (prev === next ? prev : next));
  }, [viewParam]);

  /**
   * 侧栏切换视图时回写地址栏。
   * 不回写的话，用户在个人中心点侧栏回到工作台后 URL 仍是 ?view=profile，
   * 此时再点顶栏「个人中心」推送的是同一个地址，视图不会变化。
   * 用 replace 而不是 push：视图切换属于同一页内的标签切换，不该产生一堆历史记录。
   */
  const handleChangeView = React.useCallback(
    (next: WorkbenchView) => {
      setView(next);
      // 小于 2xl 时详情是抽屉，切视图还留着会盖住新页面
      setSelectedId(null);
      // 顶栏搜索框在各视图里语义不同（任务名 / 报告号 / 帮助关键词），
      // 不做重置的话，在帮助中心搜过的词会带到工作台，看起来像"任务全没了"
      setSearch("");
      router.replace(viewHref(next), { scroll: false });
    },
    [router]
  );

  /** 抽屉态下按 Esc 关闭（宽屏常驻时 Esc 不应清空右侧选中） */
  React.useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (window.matchMedia("(max-width: 1535px)").matches) setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const keyword = search.trim().toLowerCase();

  const searched = React.useMemo(() => {
    if (!keyword) return tasks;
    return tasks.filter(
      (task) =>
        task.fileName.toLowerCase().includes(keyword) || task.id.toLowerCase().includes(keyword)
    );
  }, [tasks, keyword]);

  const visibleTasks = React.useMemo(() => {
    const byTime = [...searched].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    switch (filter) {
      case "recent":
        return byTime.filter((task) => task.status === "done").slice(0, 4);
      case "pending":
        return byTime.filter((task) => task.status === "queued" || task.status === "analyzing");
      case "flagged":
        return byTime.filter((task) => {
          const result = task.result;
          if (!result) return false;
          return result.aiProbability >= 70;
        });
      default:
        return byTime;
    }
  }, [searched, filter]);

  const selectedTask = React.useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [tasks, selectedId]
  );

  const pendingCount = tasks.filter(
    (task) => task.status === "queued" || task.status === "analyzing"
  ).length;

  const closeDetail = React.useCallback(() => setSelectedId(null), []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AuroraBackground />

      <AppSidebar view={view} onChangeView={handleChangeView} pendingCount={pendingCount} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar
          title={viewTitles[view]}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            view === "help" ? "搜索帮助问题，例如：置信度" : "搜索文件名或任务编号"
          }
          currentView={view}
        />

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto thin-scrollbar">
            <div
              className={cn(
                "mx-auto w-full px-5 pb-10 pt-6 sm:px-8",
                view === "tasks"
                  ? "max-w-[1360px]"
                  : view === "help"
                    ? "max-w-[1240px]"
                    : "max-w-[1100px]"
              )}
            >
              {view === "tasks" ? (
                <TasksView
                  tasks={tasks}
                  visibleTasks={visibleTasks}
                  selectedId={selectedId}
                  onSelect={(task) => setSelectedId(task.id)}
                  filter={filter}
                  onFilterChange={setFilter}
                  searchTerm={keyword}
                />
              ) : null}

              {view === "list" ? (
                <ListView
                  tasks={searched}
                  selectedId={selectedId}
                  onSelect={(task) => setSelectedId(task.id)}
                  searchTerm={keyword}
                />
              ) : null}

              {view === "reports" ? <ReportsView searchTerm={search} /> : null}

              {view === "help" ? (
                <HelpCenterView searchTerm={search} onSearchChange={setSearch} />
              ) : null}

              {view === "profile" ? (
                <AuthGate fallback={<ProfileLoginPrompt />}>
                  <ProfileView />
                </AuthGate>
              ) : null}
            </div>
          </main>

          {/* ≥1536px：详情常驻，与列表并排（帮助中心没有任务详情概念，不占位） */}
          {view === "help" ? null : (
            <div className="hidden 2xl:block">
              <DetailPanel task={selectedTask} />
            </div>
          )}
        </div>
      </div>

      {/* <1536px：详情改为右侧抽屉，点击卡片联动逻辑不变 */}
      {selectedTask ? (
        <div className="fixed inset-0 z-40 2xl:hidden">
          <div
            role="presentation"
            onClick={closeDetail}
            className="absolute inset-0 animate-in fade-in bg-background/70 backdrop-blur-sm duration-200"
          />
          <div className="absolute inset-y-0 right-0 max-w-[92vw] animate-in slide-in-from-right duration-300">
            <DetailPanel task={selectedTask} onClose={closeDetail} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkbenchPage() {
  const { toast } = useToast();

  /**
   * OAuth 回调处理：启动时无条件调用一次，先于任何登录态判断。
   *
   * 微信扫码 / WorkBuddy 账号登录是跳转到站点根带回 code/state/provider。
   * 这里必须放在登录墙之外、无条件执行——否则用户未登录时看到的是 LoginGate，
   * 回调没人处理，code 就丢了，表现是「点了登录转一圈又回到登录页」。
   *
   * 兑换成功后 useAuth 的 onAuthStateChange 会自动把 user 刷出来，登录墙随之
   * 切换到工作台。无 provider 参数（普通访问）时返回 handled:false，不是失败。
   */
  React.useEffect(() => {
    let cancelled = false;
    handleOAuthCallback()
      .then((result) => {
        if (cancelled) return;
        if (result.handled && result.success) {
          toast({ title: "登录成功", description: "报告将自动云端同步" });
        } else if (result.handled && result.error) {
          toast({ title: "登录失败", description: result.error, variant: "destructive" });
        }
      })
      .catch(() => {
        // 兑换过程意外失败也吞掉，不阻塞渲染
      });
    return () => {
      cancelled = true;
    };
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <React.Suspense
      fallback={
        <div className="grid h-screen place-items-center bg-background text-[13px] text-muted-foreground">
          正在加载工作台…
        </div>
      }
    >
      <WorkbenchContent />
    </React.Suspense>
  );
}
