import type { LucideIcon } from "lucide-react";
import { FileText, LayoutDashboard, ListChecks, User } from "lucide-react";

export type WorkbenchView = "tasks" | "list" | "reports" | "profile";

export interface NavItem {
  key: WorkbenchView;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { key: "tasks", label: "工作台", icon: LayoutDashboard },
  { key: "list", label: "任务列表", icon: ListChecks },
  { key: "reports", label: "报告中心", icon: FileText },
  { key: "profile", label: "个人中心", icon: User },
];
