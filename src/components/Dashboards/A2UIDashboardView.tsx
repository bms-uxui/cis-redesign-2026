/**
 * Generative dashboard host — prompt → A2UI tree → resolved tree → render.
 *
 *   1. Calls `generateA2UIDashboard(prompt)` to get an A2UIDashboard with
 *      bindings + placeholders.
 *   2. Resolves bindings via the dashboard data API (parallel fetch).
 *   3. Hands the populated A2UIResponse to the shared `A2UIRenderer`.
 *
 * Loading / error states are surfaced inline so the host page doesn't have
 * to. The renderer never sees an unresolved placeholder — the resolver
 * guarantees every `{{$key}}` is either substituted or left visible as
 * `?key` for easy QA spotting.
 */
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { IconLoader2, IconAlertTriangle } from "@tabler/icons-react";
import A2UIRenderer from "../a2ui/A2UIRenderer";
import { generateA2UIDashboard } from "./a2uiGenerator";
import { resolveDashboard, type ResolvedDashboard } from "./resolveDashboard";

interface A2UIDashboardViewProps {
  prompt: string;
  className?: string;
}

type Status = { phase: "idle" } | { phase: "loading"; step: "generate" | "resolve" } | { phase: "ready"; dash: ResolvedDashboard } | { phase: "error"; message: string };

export default function A2UIDashboardView({ prompt, className }: A2UIDashboardViewProps) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  useEffect(() => {
    if (!prompt) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus({ phase: "loading", step: "generate" });
        const dash = await generateA2UIDashboard(prompt);
        if (cancelled) return;
        setStatus({ phase: "loading", step: "resolve" });
        const resolved = await resolveDashboard(dash);
        if (cancelled) return;
        setStatus({ phase: "ready", dash: resolved });
      } catch (err) {
        if (cancelled) return;
        setStatus({ phase: "error", message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prompt]);

  if (status.phase === "idle") return null;
  if (status.phase === "loading") return <LoadingPhase step={status.step} />;
  if (status.phase === "error") return <ErrorPhase message={status.message} />;
  // Wrap the renderer in a boundary — any malformed component shape that
  // slipped past validation (e.g. unexpected node payload) is contained
  // here instead of blanking the entire page.
  return (
    <RenderBoundary>
      <A2UIRenderer response={status.dash} className={className} theme="light" />
    </RenderBoundary>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────
// Class component because React's error-boundary contract still requires
// it. Keeps the page alive when the LLM emits a shape the A2UI renderer
// can't handle — shows a recoverable fallback message instead of a blank
// screen.

interface BoundaryState {
  error: Error | null;
}

class RenderBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("[A2UIDashboardView] render boundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-2 rounded-[var(--theme-radius-box)] border border-[var(--theme-error)]/30 bg-[var(--theme-error)]/5 p-3 text-[length:var(--theme-text-sm)] text-[var(--theme-error)]">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" stroke={1.75} />
          <div className="flex flex-col gap-1">
            <span className="font-medium">เรนเดอร์ dashboard ไม่ได้</span>
            <span className="text-[var(--theme-error)]/80 text-[length:var(--theme-text-xs)]">
              LLM ส่ง UI ออกมาในรูปแบบที่ไม่รองรับ — ลองส่ง prompt อีกครั้ง หรือพิมพ์ใหม่ให้ชัดเจนขึ้น
            </span>
            <span className="text-[var(--theme-error)]/60 text-[length:var(--theme-text-xs)] font-mono">
              {this.state.error.message}
            </span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingPhase({ step }: { step: "generate" | "resolve" }) {
  const label = step === "generate" ? "กำลังให้ LLM ออกแบบ dashboard…" : "กำลังโหลดข้อมูลจาก data sources…";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full min-h-[200px] items-center justify-center gap-3 text-[var(--theme-neutral)]/60"
    >
      <IconLoader2 className="h-5 w-5 animate-spin" />
      <span className="text-[length:var(--theme-text-sm)]">{label}</span>
    </motion.div>
  );
}

function ErrorPhase({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-error)]/30 bg-[var(--theme-error)]/5 p-4 text-[length:var(--theme-text-sm)] text-[var(--theme-error)]">
      สร้าง dashboard ล้มเหลว: {message}
    </div>
  );
}
