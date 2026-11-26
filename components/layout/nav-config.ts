import type { LucideIcon } from "lucide-react";
import { CircleHelp, FileText, LayoutDashboard, Radar, UserRound } from "lucide-react";

export type WorkbenchView = "tasks" | "list" | "reports" | "help" | "profile";

export interface NavItem {
  key: WorkbenchView;
  label: string;
  icon: LucideIcon;
}

/**
 * 侧栏导航。
 * key 是视图的唯一标识，同时决定地址栏的 ?view=xxx（tasks 为默认值不带参数），
 * 因此只允许改 label / icon，不要动 key，否则 /?view=reports 这类链接会失效。
 */
export const navItems: NavItem[] = [
  { key: "tasks", label: "工作台", icon: LayoutDashboard },
  { key: "list", label: "检测中心", icon: Radar },
  { key: "reports", label: "报告中心", icon: FileText },
  { key: "help", label: "帮助中心", icon: CircleHelp },
  { key: "profile", label: "个人中心", icon: UserRound },
];
