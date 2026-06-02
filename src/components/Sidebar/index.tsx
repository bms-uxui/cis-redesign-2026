import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence } from "framer-motion";
import { useSidebar } from "../../contexts/SidebarContext";
import { RAIL_LIST } from "./config";
import type { RailEntry } from "./types";
import SidebarRail from "./SidebarRail";
import SidebarPanel from "./SidebarPanel";

/**
 * Global two-pane sidebar.
 *   • <SidebarRail>  — narrow icon column (always visible, always white).
 *   • <SidebarPanel> — wide section panel (slides in when expanded).
 *
 * State lives here:
 *   • activeRail — which rail item is highlighted.
 *   • activeChild — which sub-item inside the visible panel is selected.
 *   • collapsed (from SidebarContext) — whether the panel is rendered.
 */
export default function Sidebar() {
  const navigate = useNavigate();
  const { collapsed, setCollapsed, toggleCollapsed } = useSidebar();

  // No rail item highlighted by default — the SidebarContext starts
  // collapsed so the app opens with rail only. User explicitly picks
  // a section to expand a panel.
  const [activeRail, setActiveRail] = useState<string>("");
  const [activeChild, setActiveChild] = useState<string>("register");

  const active = RAIL_LIST.find((r) => r.key === activeRail);
  const panel = active?.panel;
  const showPanel = !collapsed && !!panel;

  const handleRailSelect = (entry: RailEntry) => {
    // Items with an explicit route always navigate and stay collapsed.
    if (entry.navigateTo) {
      setActiveRail(entry.key);
      setCollapsed(true);
      navigate(entry.navigateTo);
      return;
    }

    if (entry.key === activeRail) {
      // Same section — toggle collapse only if it has a panel.
      if (entry.panel) toggleCollapsed();
      return;
    }

    setActiveRail(entry.key);
    // Panel section → expand. Rail-only item → keep collapsed.
    setCollapsed(!entry.panel);
  };

  return (
    <aside
      aria-label="Sidebar"
      className="fixed bottom-4 left-4 top-4 z-30 hidden flex-row overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] lg:flex"
    >
      <SidebarRail activeKey={activeRail} onSelect={handleRailSelect} />

      <AnimatePresence initial={false}>
        {showPanel && panel && (
          <SidebarPanel
            panelKey={activeRail}
            panel={panel}
            activeChildKey={activeChild}
            onSelectChild={setActiveChild}
            onCollapse={() => setCollapsed(true)}
          />
        )}
      </AnimatePresence>
    </aside>
  );
}
