"use client";

// 轻量 toast 实现（无额外依赖），API 形态对齐 shadcn/ui use-toast
import * as React from "react";

type ToastVariant = "default" | "success" | "destructive";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastRecord extends ToastOptions {
  id: string;
}

let count = 0;
const TOAST_LIMIT = 3;

let memory: ToastRecord[] = [];
const listeners = new Set<(t: ToastRecord[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(memory));
}

function nextId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${count}`;
}

function dismiss(id: string) {
  memory = memory.filter((item) => item.id !== id);
  emit();
}

export function toast(options: ToastOptions) {
  const id = nextId();
  memory = [{ ...options, id }, ...memory].slice(0, TOAST_LIMIT);
  emit();

  window.setTimeout(() => dismiss(id), options.duration ?? 3200);
  return id;
}

export function removeToast(id: string) {
  dismiss(id);
}

export function useToast() {
  const [items, setItems] = React.useState<ToastRecord[]>(memory);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return { toasts: items, toast, dismiss: removeToast };
}
