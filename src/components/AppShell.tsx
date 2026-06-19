import { useEffect, useLayoutEffect, useRef } from "react";
import AivaDrawer from "./AivaDrawer";
import { AivaProvider, useAiva } from "../contexts/AivaContext";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import MenuPalette, { MenuPaletteHotkey } from "./MenuPalette";
import CustomizeSidebarModal from "./CustomizeSidebarModal";
import TabsHost from "./TabsHost";
import SelectionTTS from "./SelectionTTS";
import { DictationProvider } from "../contexts/DictationContext";
import DictationIsland from "./DictationIsland";
import { HeaderSlotProvider } from "../contexts/HeaderSlotContext";
import { TabsProvider } from "../contexts/TabsContext";
import { SidebarProvider } from "../contexts/SidebarContext";
import { UserProvider, useUser } from "../contexts/UserContext";
import { useTabs } from "../contexts/TabsContext";
import Login from "./Login";

export default function AppShell() {
  return (
    <UserProvider>
      <AuthGate />
    </UserProvider>
  );
}

/**
 * Gate the whole workspace behind the login screen. Until the user signs in
 * we render only <Login> (no top bar / sidebar / tabs); afterwards the full
 * shell and its providers mount.
 */
function AuthGate() {
  const { isAuthenticated } = useUser();
  if (!isAuthenticated) return <Login />;

  return (
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
  );
}

function AppShellInner() {
  const { open: aivaOpen, closeAiva, toggleAiva } = useAiva();
  const { user } = useUser();
  const { openTab } = useTabs();

  // Role-based landing: doctors open straight into the doctor workspace
  // (ตารางเวร / DoctorSchedule). Everyone else lands on Home (the default
  // active tab). useLayoutEffect runs before paint so there's no flash of
  // Home before the doctor tab takes over.
  const didRoute = useRef(false);
  useLayoutEffect(() => {
    if (didRoute.current) return;
    didRoute.current = true;
    if (user.role === "doctor") openTab("/schedule");
  }, [user.role, openTab]);

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

      <MenuPalette />
      <MenuPaletteHotkey />
      <CustomizeSidebarModal />
      <SelectionTTS />
    </>
  );
}
