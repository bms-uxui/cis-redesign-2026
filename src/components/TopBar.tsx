import {
  IconHome,
  IconPlus,
  IconX,
  IconSettings,
  IconLogout,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
} from "@heroui/react";

const TOOLTIP_CLASSES = {
  content:
    "bg-[#1f1f1f] text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
};
import { useNavigate } from "react-router";
import { useTabs, type Tab } from "../contexts/TabsContext";
import { useSidebar } from "../contexts/SidebarContext";
import AVATAR from "../assets/figma/ellipse-avatar.png";

/**
 * Top bar matching the Figma: EHP logo on the left, browser-style tab strip
 * aligned with the sidebar edge (left:225px), user pill on the right. The
 * "+" button at the end of the strip opens the all-menus page in a new tab.
 */
export default function TopBar() {
  const { tabs, activeId, openTab, closeTab, activateTab } = useTabs();
  const { collapsed: sidebarCollapsed } = useSidebar();
  const navigate = useNavigate();

  return (
    <header
      className={[
        // Floating card aligned with the sidebar's top edge — slides left
        // when the sidebar collapses so the strip stays glued to the rail.
        "fixed top-4 right-4 h-16 overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-[left] duration-300 ease-out",
        sidebarCollapsed ? "left-[106px]" : "left-[415px]",
      ].join(" ")}
    >
      {/* Tab strip starts at the left edge of the card. */}
      <div className="absolute left-0 top-0 flex h-full items-stretch">
        {tabs.map((tab) => (
          <TabChip
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            onActivate={() => {
              activateTab(tab.id);
              // The home icon acts as "return to home page": activating the
              // home tab also resets its inner path back to "/" if it has
              // drifted (e.g. user navigated to /patient inside it).
              if (tab.iconKind === "home" && tab.path !== "/") {
                navigate("/");
              }
            }}
            onClose={() => closeTab(tab.id)}
          />
        ))}
        <Tooltip content="เปิดแท็บใหม่" placement="bottom" delay={200} closeDelay={0} classNames={TOOLTIP_CLASSES}>
        <button
          type="button"
          aria-label="เปิดแท็บใหม่"
          onClick={() => openTab("/menus", { title: "เมนูทั้งหมด" })}
          className="flex h-full w-12 cursor-pointer items-center justify-center text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
        >
          <IconPlus className="h-5 w-5" stroke={1.75} />
        </button>
        </Tooltip>
      </div>

      {/* User pill — click to open the account menu */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <Dropdown placement="bottom-end" offset={8}>
          <DropdownTrigger>
            <button
              type="button"
              aria-label="เมนูผู้ใช้"
              title="เมนูผู้ใช้"
              className="flex items-center gap-2 rounded-2xl bg-[var(--theme-surface)] px-3 py-2 outline-none transition hover:bg-[var(--theme-primary-soft)] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/40"
            >
              <p className="whitespace-nowrap text-[14px] font-medium text-[var(--theme-neutral)]">
                นพ.ราอูล มันเมาะ
              </p>
              <img
                src={AVATAR}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <IconChevronDown
                className="h-4 w-4 text-[var(--theme-neutral)]/50"
                stroke={1.75}
              />
            </button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="เมนูผู้ใช้"
            onAction={(key) => {
              if (key === "settings") {
                openTab("/settings", { title: "การตั้งค่า" });
              } else if (key === "logout") {
                // TODO: wire to real logout flow
                console.log("[topbar] log out");
              }
            }}
            itemClasses={{
              base: "data-[hover=true]:bg-[var(--theme-primary-soft)]",
            }}
          >
            <DropdownItem
              key="settings"
              startContent={<IconSettings className="h-5 w-5" stroke={1.75} />}
            >
              การตั้งค่า
            </DropdownItem>
            <DropdownItem
              key="logout"
              color="danger"
              className="text-danger"
              startContent={<IconLogout className="h-5 w-5" stroke={1.75} />}
            >
              ออกจากระบบ
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
  );
}

interface TabChipProps {
  tab: Tab;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function TabChip({ tab, active, onActivate, onClose }: TabChipProps) {
  if (tab.iconKind === "home") {
    // Square icon-only tab for Home.
    return (
      <Tooltip content="หน้าหลัก" placement="bottom" delay={200} closeDelay={0} classNames={TOOLTIP_CLASSES}>
        <button
          type="button"
          onClick={onActivate}
          aria-label="หน้าหลัก"
          aria-current={active ? "page" : undefined}
          className={[
            "flex h-full w-16 cursor-pointer items-center justify-center border-r border-[var(--theme-neutral)]/15 transition",
            active ? "bg-[var(--theme-surface)] text-[var(--theme-primary)]" : "bg-black/[0.02] text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
          ].join(" ")}
        >
          <IconHome className="h-5 w-5" stroke={active ? 2 : 1.75} />
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      className={[
        "group relative flex h-full min-w-[140px] max-w-[220px] items-center border-r border-[var(--theme-neutral)]/15 transition",
        active ? "bg-[var(--theme-surface)]" : "bg-black/[0.02] hover:bg-[var(--theme-primary-soft)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-current={active ? "page" : undefined}
        className="flex h-full flex-1 cursor-pointer items-center px-4 py-3 text-left"
      >
        <span
          className={[
            "truncate text-[14px] font-medium",
            active ? "text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/80",
          ].join(" ")}
        >
          {tab.title}
        </span>
      </button>
      {tab.closable && (
        <Tooltip content="ปิดแท็บ" placement="bottom" delay={200} closeDelay={0} classNames={TOOLTIP_CLASSES}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="ปิดแท็บ"
            className="mr-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--theme-neutral)] opacity-60 transition hover:bg-[var(--theme-primary-soft)] hover:opacity-100"
          >
            <IconX className="h-4 w-4" stroke={1.75} />
          </button>
        </Tooltip>
      )}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--theme-primary)]"
        />
      )}
    </div>
  );
}
