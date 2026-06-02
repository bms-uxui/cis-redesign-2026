import type { ReactNode } from "react";
import { addToast } from "@heroui/react";

/**
 * Thin facade over HeroUI's `addToast` that preserves the previous
 * `useToast()` call-site API so existing consumers keep working.
 *
 * The host lives in `main.tsx` as `<ToastProvider />` from @heroui/react —
 * this file no longer renders anything itself.
 */

export type ToastTone =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "add"
  | "edit"
  | "delete"
  | "update";

// Map our internal tone → HeroUI's color prop.
const TONE_TO_COLOR: Record<
  ToastTone,
  "success" | "danger" | "warning" | "primary" | "secondary" | "default"
> = {
  success: "success",
  error: "danger",
  warning: "warning",
  info: "primary",
  add: "success",
  edit: "primary",
  delete: "danger",
  update: "secondary",
};

/**
 * Hard-coded BMS Default palette for toasts — kept independent of the
 * active theme so notification styling stays consistent even when the user
 * picks Dark / Sunset / etc. Classes are written statically (not via
 * template strings) so Tailwind's JIT can pick them up.
 */
const BMS_TONE_CLASS: Record<ToastTone, { title: string; icon: string }> = {
  success: { title: "!text-[#10b981]", icon: "!text-[#10b981]" },
  error: { title: "!text-[#ef4444]", icon: "!text-[#ef4444]" },
  warning: { title: "!text-[#f59e0b]", icon: "!text-[#f59e0b]" },
  info: { title: "!text-[#3485ff]", icon: "!text-[#3485ff]" },
  add: { title: "!text-[#10b981]", icon: "!text-[#10b981]" },
  edit: { title: "!text-[#3485ff]", icon: "!text-[#3485ff]" },
  delete: { title: "!text-[#ef4444]", icon: "!text-[#ef4444]" },
  update: { title: "!text-[#8b5cf6]", icon: "!text-[#8b5cf6]" },
};

interface ToastApi {
  show(o: {
    title: string;
    description?: string;
    tone?: ToastTone;
    duration?: number;
  }): void;
  success(title: string, description?: string): void;
  error(title: string, description?: string): void;
  warning(title: string, description?: string): void;
  info(title: string, description?: string): void;
  add(title: string, description?: string): void;
  edit(title: string, description?: string): void;
  remove(title: string, description?: string): void;
  update(title: string, description?: string): void;
}

function push(
  tone: ToastTone,
  title: string,
  description?: string,
  duration?: number,
) {
  const cls = BMS_TONE_CLASS[tone];
  addToast({
    title,
    description,
    color: TONE_TO_COLOR[tone],
    timeout: duration,
    classNames: {
      title: cls.title,
      icon: cls.icon,
    },
  });
}

const api: ToastApi = {
  show: ({ title, description, tone = "info", duration }) =>
    push(tone, title, description, duration),
  success: (title, description) => push("success", title, description),
  error: (title, description) => push("error", title, description),
  warning: (title, description) => push("warning", title, description),
  info: (title, description) => push("info", title, description),
  add: (title, description) => push("add", title, description),
  edit: (title, description) => push("edit", title, description),
  remove: (title, description) => push("delete", title, description),
  update: (title, description) => push("update", title, description),
};

/**
 * Kept for backwards compatibility — `<ToastProvider>` is no longer needed
 * (HeroUI's <ToastProvider /> in main.tsx hosts the portal). This is now a
 * passthrough so old imports don't break, but new code should drop it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast(): ToastApi {
  return api;
}
