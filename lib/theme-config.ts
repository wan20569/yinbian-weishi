/**
 * 主题色板定义。
 *
 * 这里是「唯一事实来源」：app/layout.tsx 用它初始化 next-themes，
 * 个人中心的色块选择器用它渲染预览。
 *
 * preview 里的色值是给人看的示意（深色块 / 主色点），
 * 不参与任何样式逻辑，真正的配色在 app/globals.css 的 [data-theme] 里。
 */

export interface ThemeOption {
  value: string;
  label: string;
  hint: string;
  preview: {
    background: string;
    card: string;
    primary: string;
    muted: string;
    border: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "dark",
    label: "曜石蓝",
    hint: "默认",
    preview: {
      background: "#050A16",
      card: "#0B111E",
      primary: "#23D6F6",
      muted: "#141B29",
      border: "#242E42",
    },
  },
  {
    value: "blue",
    label: "深蓝科技",
    hint: "冷调蓝",
    preview: {
      background: "#060C18",
      card: "#0C1321",
      primary: "#3D96FA",
      muted: "#161E2B",
      border: "#272F3F",
    },
  },
  {
    value: "black",
    label: "极客极暗",
    hint: "纯黑底",
    preview: {
      background: "#080808",
      card: "#121212",
      primary: "#1DD775",
      muted: "#1C1C1C",
      border: "#2E2E2E",
    },
  },
  {
    value: "light",
    label: "明亮白昼",
    hint: "浅色",
    preview: {
      background: "#F7F9FB",
      card: "#FFFFFF",
      primary: "#0A84A3",
      muted: "#E8EEF4",
      border: "#DBE2EA",
    },
  },
];

export const THEME_VALUES = THEME_OPTIONS.map((item) => item.value);

export const DEFAULT_THEME = "dark";
