/**
 * 工作台背景层：44px 网格 + 三团模糊光晕。
 * 颜色全部取主题令牌，四套主题各自换色；浅色主题会自动降低不透明度。
 * 固定定位 + pointer-events-none，不参与布局、不吃点击事件。
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="grid-bg absolute inset-0" />
      <div
        className="absolute -left-28 -top-28 h-[440px] w-[440px] rounded-full blur-[130px]"
        style={{ backgroundColor: "hsl(var(--glow-c) / var(--glow-alpha))" }}
      />
      <div
        className="absolute right-[-8%] top-[6%] h-[460px] w-[460px] rounded-full blur-[140px]"
        style={{ backgroundColor: "hsl(var(--glow-b) / var(--glow-alpha))" }}
      />
      <div
        className="absolute bottom-[-18%] left-[32%] h-[420px] w-[420px] rounded-full blur-[140px]"
        style={{ backgroundColor: "hsl(var(--glow-a) / calc(var(--glow-alpha) * 0.55))" }}
      />
    </div>
  );
}
