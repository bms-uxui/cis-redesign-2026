import { useLocation } from "react-router";
import { useEffect, useState } from "react";
import AivaDrawer from "./AivaDrawer";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import TabsHost from "./TabsHost";
import { DictationProvider } from "../contexts/DictationContext";
import GlobalLiveCaption from "./GlobalLiveCaption";
import DictationIsland from "./DictationIsland";
import { HeaderSlotProvider } from "../contexts/HeaderSlotContext";
import { TabsProvider } from "../contexts/TabsContext";
import { SidebarProvider } from "../contexts/SidebarContext";

export default function AppShell() {
  const { pathname } = useLocation();
  const isAiRoute = pathname === "/ai";
  const [aivaOpen, setAivaOpen] = useState(false);

  // Cmd+K (or Ctrl+K) toggles Aiva drawer from any screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (cmdK && !isAiRoute) {
        e.preventDefault();
        setAivaOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAiRoute]);

  return (
    <DictationProvider>
      <HeaderSlotProvider>
        <TabsProvider>
          <SidebarProvider>
            {/* Persistent top bar with browser-style tab strip. */}
            <div className="fixed inset-x-0 top-0 z-40">
              <TopBar />
            </div>

            {/* Global two-pane sidebar — visible on every tab. */}
            <Sidebar />

          {/* Dictation activity pill — floats below the navbar when active. */}
          <div className="pointer-events-none fixed left-1/2 top-[68px] z-30 -translate-x-1/2">
            <div className="pointer-events-auto">
              <DictationIsland />
            </div>
          </div>

          {/* All open tabs are mounted simultaneously — inactive tabs are
              hidden but keep their React tree so state survives a switch. */}
          <TabsHost />

            <GlobalLiveCaption />
            <AivaDrawer open={aivaOpen} onClose={() => setAivaOpen(false)} />
          </SidebarProvider>
        </TabsProvider>
      </HeaderSlotProvider>
    </DictationProvider>
  );
}
