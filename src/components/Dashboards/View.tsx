import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  IconArrowLeft,
  IconSparkles,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { getDashboard } from "./store";
import type { Dashboard } from "./types";
import DashboardGrid from "./Grid";

export default function DashboardView() {
  const params = useParams();
  const { railHidden } = useSidebar();
  const { openTab, closeTab, activeId } = useTabs();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (!params.id) return;
    const d = getDashboard(params.id);
    setDashboard(d ?? null);
  }, [params.id]);

  if (!dashboard) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)]">
        <div className="h-16" aria-hidden />
        <div className="mx-auto max-w-[600px] px-8 py-12 text-center">
          <p className="text-[length:var(--theme-text-md)] text-[var(--theme-neutral)]/55">
            ไม่พบ dashboard นี้
          </p>
          <button
            type="button"
            onClick={() => openTab("/dashboards", { title: "แดชบอร์ดของฉัน" })}
            className="mt-3 text-[length:var(--theme-text-sm)] text-[var(--theme-primary)] hover:underline"
          >
            กลับไปยังรายการ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col gap-6 overflow-y-auto px-8 pb-8 pt-10 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Back link */}
          <button
            type="button"
            onClick={() => {
              if (activeId) closeTab(activeId);
              openTab("/dashboards", { title: "แดชบอร์ดของฉัน" });
            }}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55 transition hover:text-[var(--theme-neutral)]"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.75} />
            กลับไปยังรายการ
          </button>

          {/* Header */}
          <header className="flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
              <IconLayoutDashboard
                className="h-6 w-6 text-[var(--theme-primary)]"
                stroke={1.75}
              />
              {dashboard.name}
            </h1>
            {dashboard.prompt && (
              <p className="flex items-start gap-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                <IconSparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-primary)]/70"
                  stroke={1.75}
                />
                <span>{dashboard.prompt}</span>
              </p>
            )}
          </header>

          {/* Grid */}
          <DashboardGrid widgets={dashboard.widgets} />

          {/* Audit footer */}
          <div className="mt-2 border-t border-[var(--theme-neutral)]/10 pt-3 text-[10px] text-[var(--theme-neutral)]/40">
            สร้างโดย: {dashboard.model ?? "manual"}
            {dashboard.generatedAt && (
              <> · {new Date(dashboard.generatedAt).toLocaleString("th-TH")}</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
