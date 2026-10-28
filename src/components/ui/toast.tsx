"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toasts: ToastItem[] = [];
let listeners: Array<() => void> = [];

const SERVER_SNAPSHOT: ToastItem[] = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.push(onStoreChange);
  return () => {
    listeners = listeners.filter((l) => l !== onStoreChange);
  };
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

function getServerSnapshot(): ToastItem[] {
  return SERVER_SNAPSHOT;
}

export const toast = {
  success(message: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: "success", message, duration }];
    notify();
    setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  error(message: string, duration = 5000) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: "error", message, duration }];
    notify();
    setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  info(message: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type: "info", message, duration }];
    notify();
    setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  dismiss(id: string) {
    if (!toasts.some((t) => t.id === id)) return;
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
};

export function Toaster() {
  const currentToasts = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (currentToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {currentToasts.map((item) => (
        <div
          key={item.id}
          role={item.type === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all font-[family-name:var(--font-bengali)] text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${
            item.type === "success"
              ? "border-emerald-500/30 bg-card/95 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/5"
              : item.type === "error"
              ? "border-destructive/30 bg-card/95 text-destructive shadow-destructive/5"
              : "border-brand/30 bg-card/95 text-brand shadow-brand/5"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {item.type === "success" && (
              <CheckCircle2 className="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {item.type === "error" && (
              <AlertCircle className="size-4.5 shrink-0 text-destructive" />
            )}
            {item.type === "info" && (
              <Info className="size-4.5 shrink-0 text-brand" />
            )}
            <span className="truncate leading-relaxed">{item.message}</span>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 transition-colors cursor-pointer"
            aria-label="বার্তা বন্ধ করুন"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

