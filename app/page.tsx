"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Layers, ListChecks, RadioTower } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { DetailPanel } from "@/components/layout/detail-panel";
import { TopBar } from "@/components/layout/top-bar";
import { type WorkbenchView } from "@/components/layout/nav-config";
import { ListView } from "@/components/workbench/list-view";
import { ProfileView } from "@/components/workbench/profile-view";
import { ReportsView } from "@/components/workbench/reports-view";
import { StatsOverview } from "@/components/workbench/stats-overview";
import { TaskList } from "@/components/workbench/task-list";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listTasks } from "@/lib/mock-service";
import type { Task } from "@/lib/types";

type FilterKey = "all" | "recent" | "pending" | "flagged";

const viewTitles: Record<WorkbenchView, string> = {
  tasks: "工作台",
  list: "任务列表",
  reports: "报告中心",
  profile: "个人中心",
};

const filters: Array<{ key: FilterKey; label: string; icon: React.ElementType }> = [
  { key: "all", label: "全部任务", icon: Layers },
  { key: "recent", label: "最近检测", icon: RadioTower },
  { key: "pending", label: "进行中", icon: ListChecks },
  { key: "flagged", label: "风险命中", icon: AlertTriangle },
];

function WorkbenchContent() {
  const searchParams = useSearchParams();
  const initialView = (searchParams.get("view") as WorkbenchView | null) ?? "tasks";

  const [view, setView] = React.useState<WorkbenchView>(initialView);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // 延迟初始化：返回工作台时能读到新注册的任务（纯前端内存态）
  const [tasks] = React.useState<Task[]>(() => listTasks());

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
          return result.aiProbability >= 70 || result.similarity >= 70;
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar view={view} onChangeView={setView} pendingCount={pendingCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={viewTitles[view]} search={search} onSearchChange={setSearch} />

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto thin-scrollbar">
            <div className="mx-auto max-w-[1100px] px-6 py-6">
              {view === "tasks" ? (
                <div className="space-y-5">
                  <StatsOverview tasks={tasks} />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterKey)}>
                      <TabsList>
                        {filters.map((item) => {
                          const Icon = item.icon;
                          return (
                            <TabsTrigger key={item.key} value={item.key}>
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </Tabs>
                    <span className="text-[11px] text-muted-foreground">
                      共 {visibleTasks.length} 条记录
                    </span>
                  </div>

                  <TaskList
                    tasks={visibleTasks}
                    selectedId={selectedId}
                    onSelect={(task) => setSelectedId(task.id)}
                    searchTerm={keyword}
                  />
                </div>
              ) : null}

              {view === "list" ? (
                <ListView tasks={searched} selectedId={selectedId} onSelect={(task) => setSelectedId(task.id)} />
              ) : null}

              {view === "reports" ? <ReportsView searchTerm={search} /> : null}

              {view === "profile" ? <ProfileView /> : null}
            </div>
          </main>

          <div className="hidden xl:block">
            <DetailPanel task={selectedTask} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkbenchPage() {
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
