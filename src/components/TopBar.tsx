import {
  IconHome,
  IconCalendarTime,
  IconPlus,
  IconX,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconCheck,
  IconDots,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconUser,
  IconSparkles,
} from "@tabler/icons-react";
import { useTheme, THEME_PRESETS } from "../contexts/ThemeContext";
import { useAiva } from "../contexts/AivaContext";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Tooltip,
} from "@heroui/react";

const TOOLTIP_CLASSES = {
  content:
    "bg-[#1f1f1f] text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
};
import { useNavigate } from "react-router";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTabs, type Tab } from "../contexts/TabsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useUser } from "../contexts/UserContext";
import AVATAR from "../assets/figma/ellipse-avatar.png";

/**
 * Top bar matching the Figma: EHP logo on the left, browser-style tab strip
 * aligned with the sidebar edge (left:225px), user pill on the right. The
 * "+" button at the end of the strip opens the all-menus page in a new tab.
 */
export default function TopBar() {
  const { tabs, activeId, openTab, closeTab, activateTab } = useTabs();
  const { railHidden, toggleRailHiddenSidebar } = useSidebar();
  const { config: themeConfig, applyPreset, commit: commitTheme } = useTheme();
  const { logout } = useUser();
  const navigate = useNavigate();
  const { openAiva } = useAiva();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ── Tab overflow ─────────────────────────────────────────────────────
  // The strip has a fixed amount of horizontal space; once tabs no longer
  // fit, the excess gets collapsed into a "…" chip that opens a dropdown
  // listing the hidden tabs. Active tab is always promoted into the visible
  // slice so the user can see what they're looking at.
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    setStripWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      setStripWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const HOME_W = 64;
  const PLUS_W = 48;
  const OVERFLOW_W = 56;
  // Tabs hit their min-width (140px) for typical Thai labels; using 150 as a
  // conservative average so overflow triggers before they crowd the user pill.
  const TAB_W = 150;

  const { visibleTabs, overflowTabs } = useMemo(() => {
    // Pinned icon-only tabs (Home + Schedule) always lead the strip.
    const pinned = tabs.filter((t) => t.iconKind === "home" || t.iconKind === "schedule");
    const others = tabs.filter((t) => !t.iconKind);
    // Before measurement, show everything (avoids initial flash of overflow).
    if (stripWidth === 0) {
      return {
        visibleTabs: [...pinned, ...others],
        overflowTabs: [] as Tab[],
      };
    }

    const reserve = pinned.length * HOME_W + PLUS_W;
    const fitsAll = Math.floor((stripWidth - reserve) / TAB_W);
    if (others.length <= fitsAll) {
      return {
        visibleTabs: [...pinned, ...others],
        overflowTabs: [] as Tab[],
      };
    }

    // Overflow needed — reserve another slot for the chip and recompute.
    const fitsWithChip = Math.max(
      1,
      Math.floor((stripWidth - reserve - OVERFLOW_W) / TAB_W),
    );
    const visible = others.slice(0, fitsWithChip);
    const overflow = others.slice(fitsWithChip);

    // Promote the active tab if it ended up in overflow.
    if (
      activeId &&
      !visible.some((t) => t.id === activeId) &&
      overflow.some((t) => t.id === activeId)
    ) {
      const activeIdx = overflow.findIndex((t) => t.id === activeId);
      const moved = overflow.splice(activeIdx, 1)[0];
      // Push the last visible tab back into overflow at the front so the
      // order roughly matches insertion order.
      const displaced = visible.pop();
      visible.push(moved);
      if (displaced) overflow.unshift(displaced);
    }

    return {
      visibleTabs: [...pinned, ...visible],
      overflowTabs: overflow,
    };
  }, [tabs, stripWidth, activeId]);

  return (
    <header
      className={[
        // Floating card. On tablet (< lg) the pinned sidebar is gone — it
        // becomes a drawer — so the bar tucks next to the hamburger; at lg+
        // it aligns with the sidebar's top edge / collapsed gutter.
        "fixed top-4 right-4 h-12 overflow-hidden rounded-[16px] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] transition-[left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        // Tablet: clear the hamburger (left-4 + w-12 = 64px) with a 12px gap.
        "left-[76px]",
        railHidden ? "lg:left-4" : "lg:left-[296px]",
      ].join(" ")}
    >
      {/* Sidebar toggle — shown only when sidebar is fully hidden. Restores
          the rail when clicked. Lives at the leftmost edge of the topbar. */}
      {railHidden && (
        <Tooltip
          content="แสดงแถบเครื่องมือ"
          placement="bottom"
          delay={200}
          closeDelay={0}
          classNames={TOOLTIP_CLASSES}
        >
          <button
            type="button"
            aria-label="แสดงแถบเครื่องมือ"
            onClick={toggleRailHiddenSidebar}
            className="flex h-full w-14 shrink-0 cursor-pointer items-center justify-center border-r border-[var(--theme-neutral)]/10 text-[var(--theme-neutral)]/70 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
          >
            <IconLayoutSidebarLeftExpand className="h-5 w-5" stroke={1.6} />
          </button>
        </Tooltip>
      )}

      {/* Tab strip — runs from left:0 (or 56 when sidebar is hidden) to a
          right boundary that reserves room for the user pill. The overflow
          logic above lives in `visibleTabs` / `overflowTabs`. */}
      <div
        ref={stripRef}
        className="absolute top-0 flex h-full items-stretch overflow-hidden"
        style={{ left: railHidden ? 56 : 0, right: 260 }}
      >
        {visibleTabs.map((tab) => (
          <TabChip
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            onActivate={() => {
              activateTab(tab.id);
              // The pinned home / schedule icons act as "return to that page":
              // activating them also resets the tab's inner path if it has
              // drifted (e.g. opened a patient from the schedule, which
              // navigates the schedule tab to /opd/:hn).
              if (tab.iconKind === "home" && tab.path !== "/") {
                navigate("/");
              } else if (tab.iconKind === "schedule" && tab.path !== "/schedule") {
                navigate("/schedule");
              }
            }}
            onClose={() => closeTab(tab.id)}
          />
        ))}

        {overflowTabs.length > 0 && (
          <Dropdown placement="bottom-start" offset={4}>
            <DropdownTrigger>
              <button
                type="button"
                aria-label={`แท็บที่ซ่อนอยู่ (${overflowTabs.length})`}
                className="flex h-full w-14 shrink-0 cursor-pointer items-center justify-center gap-1 border-r border-[var(--theme-neutral)]/15 text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
              >
                <IconDots className="h-4 w-4" stroke={1.75} />
                <span className="text-[length:var(--theme-text-xs)] font-medium">
                  {overflowTabs.length}
                </span>
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="แท็บที่ซ่อนอยู่"
              classNames={{ base: "min-w-[260px]" }}
              onAction={(rawKey) => {
                const key = String(rawKey);
                if (key.startsWith("close:")) {
                  closeTab(key.slice("close:".length));
                  return;
                }
                if (key.startsWith("activate:")) {
                  activateTab(key.slice("activate:".length));
                }
              }}
            >
              {overflowTabs.map((t) => (
                <DropdownItem
                  key={`activate:${t.id}`}
                  endContent={
                    t.closable ? (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="ปิดแท็บ"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(t.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            closeTab(t.id);
                          }
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[var(--theme-neutral)]/50 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
                      >
                        <IconX className="h-3.5 w-3.5" stroke={1.75} />
                      </span>
                    ) : null
                  }
                >
                  <span className="truncate">{t.title}</span>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        )}

        <Tooltip content="เปิดแท็บใหม่" placement="bottom" delay={200} closeDelay={0} classNames={TOOLTIP_CLASSES}>
        <button
          type="button"
          aria-label="เปิดแท็บใหม่"
          onClick={() => openTab("/menus", { title: "เมนูทั้งหมด" })}
          className="flex h-full w-12 shrink-0 cursor-pointer items-center justify-center text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
        >
          <IconPlus className="h-5 w-5" stroke={1.75} />
        </button>
        </Tooltip>
      </div>

      {/* Right actions — AI chat launcher + user pill */}
      <div className="absolute right-[3px] top-1/2 flex -translate-y-1/2 items-center gap-2">
        <Tooltip
          content={
            <span className="flex items-center gap-2">
              ถามเมย์
              <kbd className="inline-flex h-4 min-w-[20px] items-center justify-center rounded border border-white/20 px-1 font-mono text-[10px] font-semibold">
                ⌘K
              </kbd>
            </span>
          }
          placement="bottom"
          delay={200}
          closeDelay={0}
          classNames={TOOLTIP_CLASSES}
        >
          <button
            type="button"
            aria-label="ถามเมย์"
            onClick={() => openAiva()}
            className="flex h-8 cursor-pointer items-center gap-1 rounded-full bg-gradient-to-br from-[#5DB4F8] to-[#7556E2] px-3 text-white shadow-[0_3px_10px_-2px_rgba(117,86,226,0.4)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.04] hover:shadow-[0_5px_14px_-2px_rgba(117,86,226,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7556E2]/50"
          >
            <IconSparkles className="h-4 w-4 fill-white" stroke={1.5} />
            <span className="text-[12px] font-semibold">ถามเมย์</span>
          </button>
        </Tooltip>

        <Dropdown
          placement="bottom-end"
          offset={8}
          isOpen={userMenuOpen}
          onOpenChange={setUserMenuOpen}
          classNames={{
            // Theme-aware popover surface so dark presets get a dark menu.
            content:
              "bg-[var(--theme-surface)] text-[var(--theme-neutral)] border border-[var(--theme-neutral)]/10 shadow-[var(--theme-shadow-md)]",
          }}
        >
          <DropdownTrigger>
            <button
              type="button"
              aria-label="เมนูผู้ใช้"
              title="เมนูผู้ใช้"
              className="flex items-center gap-2 rounded-[12px] bg-[var(--theme-surface)] px-3 py-2 outline-none transition hover:bg-[var(--theme-primary-soft)] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/40"
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
            // Manual control: HeroUI normally closes the dropdown on every
            // item click. We keep it open for theme swaps so users can flip
            // between presets, and only close for the other actions.
            closeOnSelect={false}
            onAction={(rawKey) => {
              const key = String(rawKey);
              if (key.startsWith("preset:")) {
                applyPreset(key.slice("preset:".length));
                commitTheme();
                return;
              }
              switch (key) {
                case "profile":
                  openTab("/profile", { title: "โปรไฟล์" });
                  break;
                case "settings":
                  openTab("/settings", { title: "การตั้งค่า" });
                  break;
                case "logout":
                  logout();
                  break;
              }
              setUserMenuOpen(false);
            }}
            itemClasses={{
              base: "data-[hover=true]:bg-[var(--theme-primary-soft)] gap-2 py-2",
            }}
            // User identity card at the top — large avatar, name, email.
            // Jira-style header above the action items.
            topContent={
              <div className="m-1 flex items-center gap-3 rounded-[var(--theme-radius-field)] bg-[var(--theme-base)] p-3">
                <img
                  src={AVATAR}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                    นพ.ราอูล มันเมาะ
                  </p>
                  <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                    raul.mannmoh@hospital.co.th
                  </p>
                </div>
              </div>
            }
          >
            <DropdownSection showDivider>
              <DropdownItem
                key="profile"
                startContent={<IconUser className="h-5 w-5" stroke={1.75} />}
              >
                โปรไฟล์
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<IconSettings className="h-5 w-5" stroke={1.75} />}
              >
                การตั้งค่าบัญชี
              </DropdownItem>
            </DropdownSection>
            <DropdownSection title="ธีม" showDivider>
              {THEME_PRESETS.map((p) => {
                const active = themeConfig.presetId === p.id;
                return (
                  <DropdownItem
                    key={`preset:${p.id}`}
                    closeOnSelect={false}
                    startContent={
                      <span
                        aria-hidden
                        className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--theme-neutral)]/15"
                      >
                        <span
                          className="w-1/3"
                          style={{ backgroundColor: p.colors.primary }}
                        />
                        <span
                          className="w-1/3"
                          style={{ backgroundColor: p.colors.accent }}
                        />
                        <span
                          className="w-1/3"
                          style={{ backgroundColor: p.colors.base }}
                        />
                      </span>
                    }
                    endContent={
                      active ? (
                        <IconCheck
                          className="h-4 w-4 text-[var(--theme-primary)]"
                          stroke={2}
                        />
                      ) : null
                    }
                  >
                    {p.name}
                  </DropdownItem>
                );
              })}
            </DropdownSection>
            <DropdownSection>
              <DropdownItem
                key="logout"
                color="danger"
                className="text-danger"
                startContent={<IconLogout className="h-5 w-5" stroke={1.75} />}
              >
                ออกจากระบบ
              </DropdownItem>
            </DropdownSection>
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
  if (tab.iconKind === "home" || tab.iconKind === "schedule") {
    const label = tab.iconKind === "home" ? "หน้าหลัก" : "ตารางเวร";
    const Icon = tab.iconKind === "home" ? IconHome : IconCalendarTime;
    return (
      <Tooltip content={label} placement="bottom" delay={200} closeDelay={0} classNames={TOOLTIP_CLASSES}>
        <button
          type="button"
          onClick={onActivate}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={[
            "flex h-full w-16 cursor-pointer items-center justify-center border-r border-[var(--theme-neutral)]/15 transition",
            active ? "bg-[var(--theme-surface)] text-[var(--theme-primary)]" : "bg-black/[0.02] text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" stroke={active ? 2 : 1.75} />
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
