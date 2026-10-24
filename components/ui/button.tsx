import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // [&_svg] 统一处理按钮内图标：悬停按钮时放大 1.3 倍。
  // 用 [&:hover_svg]（父元素 hover）而不是 hover:[&_svg]（svg 自身 hover），
  // 因为 svg 常带 pointer-events-none，直接监听 svg 的 hover 不会触发。
  // group/btn 供文字标签监听：文字放大在 span 上做，图标单独放大，两者互不叠加。
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 [&:hover_svg]:scale-130",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-subtle",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-subtle",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // 只把「文本节点」包成 span 交给 group-hover/group-active 放大；
    // 图标等元素原样保留，否则 span 的 scale 会和 svg 自身的 scale-130 相乘。
    // asChild 时 Slot 只接受单一子元素，不能包，保持原样。
    const content = asChild
      ? children
      : React.Children.map(children, (child) =>
          typeof child === "string" || typeof child === "number" ? (
            <span className="inline-block transition-transform duration-200 group-hover/btn:scale-110 group-active/btn:scale-110">
              {child}
            </span>
          ) : (
            child
          )
        );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
