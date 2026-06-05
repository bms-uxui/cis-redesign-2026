import { useEffect } from "react";
import AivaDrawer from "./AivaDrawer";
import { AivaProvider, useAiva } from "../contexts/AivaContext";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import MenuPalette, { MenuPaletteHotkey } from "./MenuPalette";
import MenuPaletteHint from "./MenuPaletteHint";
import CustomizeSidebarModal from "./CustomizeSidebarModal";
import TabsHost from "./TabsHost";
import { DictationProvider } from "../contexts/DictationContext";
import GlobalLiveCaption from "./GlobalLiveCaption";
import DictationIsland from "./DictationIsland";
import { HeaderSlotProvider } from "../contexts/HeaderSlotContext";
import { TabsProvider } from "../contexts/TabsContext";
import { SidebarProvider } from "../contexts/SidebarContext";
import { UserProvider } from "../contexts/UserContext";

export default function AppShell() {
  return (
    <UserProvider>
    <DictationProvider>
      <HeaderSlotProvider>
        <TabsProvider>
          <SidebarProvider>
            <AivaProvider>
              <AppShellInner />
            </AivaProvider>
          </SidebarProvider>
        </TabsProvider>
      </HeaderSlotProvider>
    </DictationProvider>
    </UserProvider>
  );
}

function AppShellInner() {
  const { open: aivaOpen, closeAiva, toggleAiva } = useAiva();

  // Cmd+K (or Ctrl+K) toggles Aiva drawer from any screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (cmdK) {
        e.preventDefault();
        toggleAiva();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleAiva]);

  return (
    <>
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

      {/* Row layout: workspace column on the left, AI column on the right.
          Each column scrolls independently so the TopBar stays pinned and
          the page can't overflow the viewport. */}
      <div className="flex h-screen overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <TabsHost />
        </div>
        <AivaDrawer open={aivaOpen} onClose={closeAiva} />
      </div>

      <GlobalLiveCaption />
      <MenuPalette />
      <MenuPaletteHotkey />
      <MenuPaletteHint />
      <CustomizeSidebarModal />
    </>
  );
}
