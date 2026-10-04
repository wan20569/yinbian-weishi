"use client";

import * as React from "react";

import { toast } from "@/components/ui/use-toast";
import { getDetectCount, resetDetectCount } from "@/lib/demo-script";

/**
 * 隐藏的「重置演示」入口：放在页脚合规提示旁，默认极低对比度，hover 才显现。
 * 点击后清空 localStorage 里的演示计数并提示。
 */
export function DemoResetButton({ className }: { className?: string }) {
  const [count, setCount] = React.useState(0);

  // 计数只能在客户端读，避免 SSR / CSR 不一致
  React.useEffect(() => {
    setCount(getDetectCount());
  }, []);

  const handleReset = () => {
    resetDetectCount();
    setCount(0);
    toast({
      title: "演示计数已重置",
      description: "下一次上传将重新从第 1 次（原创作品）开始演示",
      variant: "success",
    });
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      title="重置演示计数（答辩反复演示用）"
      className={
        className ??
        "rounded text-[10px] text-muted-foreground/35 underline-offset-2 transition-colors hover:text-foreground hover:underline"
      }
    >
      重置演示{count > 0 ? `（当前第 ${count} 次）` : null}
    </button>
  );
}
