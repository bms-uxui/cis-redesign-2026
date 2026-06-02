import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconUser,
  IconUsers,
  IconStethoscope,
  IconPill,
  IconTestPipe,
  IconScan,
  IconCash,
  IconWand,
  IconCalendarEvent,
  IconHome,
  IconList,
  IconFileText,
  IconDental,
  IconHeartbeat,
  IconReportMedical,
  IconBriefcase,
  IconDatabaseExport,
  IconVirus,
  IconSettings,
  IconReceipt2,
  IconHomeHeart,
  IconShare3,
  IconChartBar,
  IconBox,
  IconVideo,
  IconServer,
  IconLayoutGrid,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import DOCK_OPD from "../assets/figma/dock-opd.svg";
import DOCK_3 from "../assets/figma/dock-3.svg";
import DOCK_4 from "../assets/figma/dock-4.svg";
import DOCK_5 from "../assets/figma/dock-5.svg";
import DOCK_6 from "../assets/figma/dock-6.svg";
import DOCK_7 from "../assets/figma/dock-7.svg";
import DOCK_BLOCKS from "../assets/figma/dock-blocks.svg";

export type DockSubIconKind =
  | "person"
  | "people"
  | "stethoscope"
  | "pill"
  | "vial"
  | "scan"
  | "money"
  | "wand"
  | "calendar"
  | "home"
  | "list"
  | "file"
  | "tooth"
  | "checkup"
  | "report";

export interface DockSubItem {
  label: string;
  /** Short subtitle describing what this item does (Billo-style mega-menu row). */
  description?: string;
  /** Icon hint — renders a soft-rounded square with a tabler icon. */
  iconHint?: DockSubIconKind;
  active?: boolean;
  /** Nested children turn this row into a collapsible folder. */
  children?: DockSubItem[];
  onClick?: () => void;
}

export type DockItem =
  | {
      kind: "icon";
      /** SVG src for custom artwork; mutually exclusive with tablerIcon. */
      icon?: string;
      /** Tabler icon component — preferred for module icons going forward. */
      tablerIcon?: TablerIcon;
      label: string;
      active?: boolean;
      onClick?: () => void;
      subItems?: DockSubItem[];
    }
  | {
      kind: "label-icon";
      icon: string;
      /** Optional tabler icon — when present, the dock renders an inline
          icon+label pill instead of the regular icon-only slot. */
      tablerIcon?: TablerIcon;
      label: string;
      active?: boolean;
      onClick?: () => void;
      subItems?: DockSubItem[];
    }
  | { kind: "divider" };

export const DEFAULT_DOCK_ITEMS: DockItem[] = [
  { kind: "icon", tablerIcon: IconHome, label: "Home" },
  {
    kind: "label-icon",
    icon: DOCK_OPD,
    label: "OPD Registry",
    subItems: [
      {
        label: "ทะเบียนผู้ป่วย",
        iconHint: "people",
        description: "ลงทะเบียน / แก้ไขข้อมูลผู้ป่วย",
      },
      {
        label: "ส่งตรวจผู้ป่วย",
        iconHint: "stethoscope",
        description: "ส่งตรวจ OPD และเลือกห้องตรวจ",
      },
      {
        label: "ผู้มารับบริการ",
        iconHint: "list",
        description: "รายชื่อผู้รับบริการวันนี้",
      },
      {
        label: "การนัดหมาย",
        iconHint: "calendar",
        description: "ตารางนัดหมายและจองคิว",
      },
      {
        label: "ผู้ป่วยเรื้อรัง",
        iconHint: "report",
        description: "ทะเบียนผู้ป่วยโรคเรื้อรัง (NCD)",
      },
      {
        label: "นัดหมายฟอกเลือด",
        iconHint: "calendar",
        description: "ตารางนัดหมายฟอกไต (HD)",
      },
    ],
  },
  {
    kind: "icon",
    icon: DOCK_3,
    label: "Workbench",
    subItems: [
      { label: "Nurse", iconHint: "stethoscope", description: "Vital signs และบันทึกการพยาบาล" },
      { label: "One Stop Service", iconHint: "people", description: "บริการครบจุดเดียว" },
      { label: "ทะเบียนเวชศาสตร์ฟื้นฟู", iconHint: "person", description: "Rehab medicine registry" },
      { label: "ePrescription", iconHint: "pill", description: "ใบสั่งยาอิเล็กทรอนิกส์" },
      { label: "ทะเบียนจัดส่งยาที่บ้าน", iconHint: "home", description: "Home medication delivery" },
      { label: "Dispensary", iconHint: "pill", description: "ห้องจ่ายยา" },
      { label: "Medical Certificate", iconHint: "file", description: "ออกใบรับรองแพทย์" },
      { label: "Dental", iconHint: "tooth", description: "คลินิกทันตกรรม", children: [] },
      { label: "Finance", iconHint: "money", description: "การเงินผู้ป่วยนอก" },
      { label: "Finance Merchant Payment", iconHint: "money", description: "ชำระผ่าน merchant" },
      { label: "Laboratory", iconHint: "vial", description: "ห้องปฏิบัติการ" },
      { label: "Radiology", iconHint: "scan", description: "เอกซเรย์ / CT / MRI" },
      { label: "Beauty Clinic", iconHint: "wand", description: "ความงาม" },
      { label: "Nurse Home Visit", iconHint: "home", description: "เยี่ยมบ้าน" },
      { label: "Checkup", iconHint: "checkup", description: "ตรวจสุขภาพ", children: [] },
    ],
  },
  { kind: "icon", tablerIcon: IconDatabaseExport, label: "Data Export" },
  { kind: "icon", tablerIcon: IconVirus, label: "EPIDEM" },
  { kind: "icon", tablerIcon: IconSettings, label: "Setting" },
  { kind: "icon", tablerIcon: IconReceipt2, label: "Claims Submission" },
  { kind: "icon", tablerIcon: IconHomeHeart, label: "PCU" },
  { kind: "icon", tablerIcon: IconShare3, label: "Referral" },
  { kind: "icon", tablerIcon: IconChartBar, label: "Report" },
  { kind: "icon", tablerIcon: IconBox, label: "Inventory" },
  { kind: "icon", tablerIcon: IconVideo, label: "Telehealth" },
  { kind: "icon", tablerIcon: IconServer, label: "System" },
];

interface MacDockProps {
  items?: DockItem[];
  baseSize?: number;
  maxScale?: number;
  iconRatio?: number;
  variant?: "floating" | "docked";
  /** Where in the viewport the dock lives. Controls submenu drop direction,
   *  docked corner radii, and notch position. */
  position?: "bottom" | "top";
  /** Cap the visible items; the rest collapse behind a "More" tile that
   *  triggers `onShowAll`. Default 7 (Miller's Law). */
  maxVisible?: number;
  onShowAll?: () => void;
}

// Per-frame lerp factor — higher = snappier transition between modes.
const MODE_LERP = 0.12;
// Per-frame lerp factor for hover magnification.
const HOVER_LERP = 0.28;
const SUBMENU_CLOSE_DELAY_MS = 120;

export default function MacDock({
  items: rawItems = DEFAULT_DOCK_ITEMS,
  baseSize = 64,
  maxScale = 1.6,
  iconRatio = 0.38,
  variant = "floating",
  position = "bottom",
  maxVisible = 7,
  onShowAll,
}: MacDockProps) {
  // Trim to maxVisible; if anything overflows, append a "More" tile.
  // Dividers don't count toward the visible cap.
  const items = (() => {
    const nonDivider = rawItems.filter((it) => it.kind !== "divider");
    if (nonDivider.length <= maxVisible) return rawItems;
    const visible = rawItems.slice(0, maxVisible);
    const moreTile: DockItem = {
      kind: "icon",
      tablerIcon: IconLayoutGrid,
      label: "เมนูทั้งหมด",
      onClick: onShowAll,
    };
    return [...visible, moreTile];
  })();
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const imgRefs = useRef<(HTMLElement | null)[]>([]);
  const centersRef = useRef<number[]>([]);
  const mouseXRef = useRef<number | null>(null);
  const currentScales = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  // Target props (read by the rAF loop without retriggering effects).
  const targetBase = useRef(baseSize);
  const currentBase = useRef(baseSize);
  const targetIconRatio = useRef(iconRatio);
  const currentIconRatio = useRef(iconRatio);
  const targetMaxScale = useRef(maxScale);

  // Submenu state.
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [tooltipSlot, setTooltipSlot] = useState<number | null>(null);
  const tooltipTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const openMenu = useCallback((i: number) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenSubmenu(i);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpenSubmenu(null);
      closeTimer.current = null;
    }, SUBMENU_CLOSE_DELAY_MS);
  }, []);

  // Keep the refs in sync with the latest props (no re-mount of rAF loop).
  useEffect(() => {
    targetBase.current = baseSize;
    targetIconRatio.current = iconRatio;
    targetMaxScale.current = maxScale;
  }, [baseSize, iconRatio, maxScale]);

  const measure = useCallback(() => {
    centersRef.current = slotRefs.current.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const tick = () => {
      currentBase.current +=
        (targetBase.current - currentBase.current) * MODE_LERP;
      currentIconRatio.current +=
        (targetIconRatio.current - currentIconRatio.current) * MODE_LERP;

      const base = currentBase.current;
      const ratio = currentIconRatio.current;
      const influence = base * 2.5;
      const maxS = targetMaxScale.current;

      if (containerRef.current) {
        containerRef.current.style.height = `${base + 16}px`;
      }

      const centers = centersRef.current;
      const mx = mouseXRef.current;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "divider") continue;
        const c = centers[i];
        let target = 1;
        if (mx !== null && c) {
          const d = Math.abs(mx - c);
          if (d < influence) {
            const t = 1 - d / influence;
            target = 1 + (maxS - 1) * Math.pow(t, 1.3);
          }
        }
        const cur = currentScales.current[i] ?? 1;
        const next = cur + (target - cur) * HOVER_LERP;
        currentScales.current[i] = next;

        const size = base * next;
        const slot = slotRefs.current[i];
        const btn = btnRefs.current[i];
        const img = imgRefs.current[i];
        const inlineLabel =
          items[i].kind === "label-icon" &&
          (items[i] as { tablerIcon?: unknown }).tablerIcon;
        if (slot) {
          if (!inlineLabel) slot.style.width = `${size}px`;
          slot.style.height = `${size}px`;
        }
        if (btn && !inlineLabel) {
          btn.style.width = `${size}px`;
          btn.style.height = `${size}px`;
        }
        if (img && items[i].kind !== "label-icon") {
          const iSize = size * ratio;
          img.style.width = `${iSize}px`;
          img.style.height = `${iSize}px`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [items]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    mouseXRef.current = e.clientX;
  }, []);
  const handleLeave = useCallback(() => {
    mouseXRef.current = null;
  }, []);

  const dockedRadius = position === "top" ? "0 0 28px 28px" : "28px 28px 0 0";
  const floatingRadius = "9999px";

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`flex gap-2 border border-white/40 bg-white/65 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl ${
        position === "top" ? "items-center" : "items-end"
      }`}
      animate={{
        borderRadius: variant === "docked" ? dockedRadius : floatingRadius,
      }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: baseSize + 16 }}
    >
      {items.map((item, i) => {
        if (item.kind === "divider") {
          return (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              className="mx-1 h-10 w-px shrink-0 self-center rounded-full bg-[#d9d9d9]"
            />
          );
        }
        const isLabel = item.kind === "label-icon";
        // When a label-icon entry has a TablerIcon (no SVG art), render it
        // as an inline pill with icon + text label — like a "Dashboard" tab.
        const isInlineLabelIcon =
          item.kind === "label-icon" && !!item.tablerIcon;
        const hasSubmenu = !!item.subItems && item.subItems.length > 0;
        return (
          // Hit-area wrapper. Mouse events live here on a div that fills the
          // full dock-capsule height so cursor jitter outside the icon circle
          // doesn't close the submenu. The inner visual slot keeps its
          // baseSize × baseSize geometry for the rAF measurement loop.
          <div
            key={i}
            className="relative flex shrink-0 items-stretch justify-center self-stretch"
            style={{ width: isInlineLabelIcon ? "auto" : baseSize }}
            onMouseEnter={() => {
              if (hasSubmenu) {
                openMenu(i);
                return;
              }
              if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
              tooltipTimer.current = window.setTimeout(() => setTooltipSlot(i), 120);
            }}
            onMouseLeave={() => {
              if (hasSubmenu) scheduleClose();
              if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
              tooltipTimer.current = null;
              setTooltipSlot((s) => (s === i ? null : s));
            }}
          >
          <div
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            className={`relative flex justify-center ${position === "top" ? "items-center" : "items-end"}`}
            style={{
              width: isInlineLabelIcon ? "auto" : baseSize,
              height: baseSize,
            }}
          >
            <button
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              onClick={item.onClick}
              aria-label={item.label}
              aria-haspopup={hasSubmenu || undefined}
              aria-expanded={hasSubmenu ? openSubmenu === i : undefined}
              className={`relative flex items-center justify-center rounded-full bg-[#ececee] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#dcdce0] ${
                isInlineLabelIcon ? "gap-2 px-4" : ""
              }`}
              style={{
                width: isInlineLabelIcon ? "auto" : baseSize,
                height: baseSize,
                willChange: "width, height",
              }}
            >
              {/* Shared active pill — same layoutId across all slots makes
                  framer-motion morph the element between dock buttons. The
                  scale keyframes [1 → 0.32 → 1] make it pinch into a small
                  dot mid-travel and bloom back, giving a liquid-metaball
                  morph between targets. */}
              {(item.active || (item.kind === "label-icon" && item.active)) && (
                <motion.span
                  layoutId="dock-active-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-2px_3px_rgba(0,0,0,0.4)]"
                  transition={{
                    layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                  }}
                />
              )}
              {isInlineLabelIcon && item.tablerIcon ? (
                (() => {
                  const Icon = item.tablerIcon;
                  const size = baseSize * iconRatio;
                  return (
                    <>
                      <span
                        className={`relative z-10 inline-flex items-center justify-center ${
                          item.active ? "text-white" : "text-gray-800"
                        }`}
                        style={{ width: size, height: size }}
                      >
                        <Icon stroke={1.8} style={{ width: "100%", height: "100%" }} />
                      </span>
                      <span
                        className={`relative z-10 whitespace-nowrap text-sm font-medium leading-none ${
                          item.active ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {item.label}
                      </span>
                    </>
                  );
                })()
              ) : item.kind === "icon" && item.tablerIcon ? (
                (() => {
                  const Icon = item.tablerIcon;
                  const size = baseSize * iconRatio;
                  return (
                    <span
                      ref={(el) => {
                        imgRefs.current[i] = el;
                      }}
                      className={`relative z-10 inline-flex items-center justify-center ${
                        item.active ? "text-white" : "text-gray-800"
                      }`}
                      style={{
                        width: size,
                        height: size,
                        willChange: "width, height",
                      }}
                    >
                      <Icon stroke={1.8} style={{ width: "100%", height: "100%" }} />
                    </span>
                  );
                })()
              ) : (
                <img
                  ref={(el) => {
                    imgRefs.current[i] = el;
                  }}
                  src={item.icon}
                  alt=""
                  className={`relative z-10 ${isLabel ? "h-full w-full" : ""}`}
                  style={
                    isLabel
                      ? {
                          // Invert OPD-style label SVGs to white when the
                          // module is the active route.
                          filter: (item as { active?: boolean }).active
                            ? "brightness(0) invert(1)"
                            : undefined,
                        }
                      : {
                          width: baseSize * iconRatio,
                          height: baseSize * iconRatio,
                          willChange: "width, height",
                        }
                  }
                />
              )}
            </button>
          </div>

            <AnimatePresence>
              {hasSubmenu && openSubmenu === i && (
                <DockSubmenu
                  items={item.subItems!}
                  direction={position === "top" ? "down" : "up"}
                  onMouseEnter={() => openMenu(i)}
                  onMouseLeave={scheduleClose}
                  onSelect={() => setOpenSubmenu(null)}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!hasSubmenu && tooltipSlot === i && (
                <div
                  className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 ${
                    position === "top" ? "top-full mt-3" : "bottom-full mb-3"
                  }`}
                >
                  <motion.div
                    role="tooltip"
                    initial={{ opacity: 0, y: position === "top" ? -4 : 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: position === "top" ? -2 : 2, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="whitespace-nowrap rounded-lg bg-black/85 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur"
                  >
                    {item.label}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

interface DockSubmenuProps {
  items: DockSubItem[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSelect: () => void;
  direction?: "up" | "down";
}

function DockSubmenu({
  items,
  onMouseEnter,
  onMouseLeave,
  onSelect,
  direction = "up",
}: DockSubmenuProps) {
  const isDown = direction === "down";
  // Outer wrapper owns positioning (CSS transform: translateX(-50%)).
  // Inner motion.div owns the entry/exit animation so framer-motion's transform
  // doesn't fight the centering — same fix we applied to the tooltip.
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute left-1/2 z-50 -translate-x-1/2 ${
        isDown ? "top-full pt-3" : "bottom-full pb-3"
      }`}
    >
    <motion.div
      role="menu"
      initial={{ opacity: 0, y: isDown ? -10 : 10, scale: 0.94, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: isDown ? -6 : 6, scale: 0.96, filter: "blur(6px)" }}
      transition={{
        opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
        filter: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{
        transformOrigin: isDown ? "50% 0%" : "50% 100%",
        willChange: "transform, opacity, filter",
      }}
    >
      {(() => {
        const total = countItemsDeep(items);
        const hasRichRows = items.some((it) => it.description || it.iconHint);
        // Billo-style mega-menu when:
        //   - there are descriptions/icons (rich rows), OR
        //   - the flat tree is large (10+ items).
        const useMega = hasRichRows || total >= 10;
        const useTwoCol = useMega && items.length > 6;
        const width = useTwoCol ? 580 : useMega ? 320 : total > 8 ? 280 : 220;
        return (
          <div
            className="relative rounded-[32px] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ width }}
          >
            <div
              className={`${useMega ? "max-h-[520px]" : "max-h-[440px]"} overflow-y-auto pr-1`}
            >
              {useMega ? (
                <MegaMenu items={items} twoCol={useTwoCol} onSelect={onSelect} />
              ) : (
                <MenuTree items={items} depth={0} onSelect={onSelect} />
              )}
            </div>
            {/* notch — points toward the dock */}
            <div
              aria-hidden
              className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[4px] bg-white ${
                isDown ? "-top-2" : "-bottom-2"
              }`}
              style={{
                boxShadow: isDown
                  ? "-2px -2px 4px rgba(0,0,0,0.06)"
                  : "2px 2px 4px rgba(0,0,0,0.06)",
              }}
            />
          </div>
        );
      })()}
    </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recursive collapsible menu tree.
 * Matches the EHP left-tree mental model (Jakob's Law) — folders expand
 * inline with chevron rotation, leaves trigger onSelect. Indentation
 * scales by depth so deep nesting (3+ levels) stays legible.            */

function countItemsDeep(items: DockSubItem[]): number {
  let n = items.length;
  for (const it of items) if (it.children) n += countItemsDeep(it.children);
  return n;
}

interface MenuTreeProps {
  items: DockSubItem[];
  depth: number;
  onSelect: () => void;
}

function MenuTree({ items, depth, onSelect }: MenuTreeProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <MenuRow key={i} item={item} depth={depth} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function MenuRow({
  item,
  depth,
  onSelect,
}: {
  item: DockSubItem;
  depth: number;
  onSelect: () => void;
}) {
  const isFolder = !!item.children;
  const [open, setOpen] = useState(false);

  const handle = () => {
    if (isFolder) {
      setOpen((v) => !v);
      return;
    }
    item.onClick?.();
    onSelect();
  };

  return (
    <li>
      <button
        role={isFolder ? undefined : "menuitem"}
        aria-expanded={isFolder ? open : undefined}
        onClick={handle}
        style={{ paddingLeft: 12 + depth * 14 }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg py-1.5 pr-3 text-left text-[14px] font-medium text-black transition ${
          item.active ? "bg-black/5" : "hover:bg-black/[0.04]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isFolder && (
            <motion.span
              aria-hidden
              className="inline-block text-[12px] text-black/40"
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              ›
            </motion.span>
          )}
          <span className="truncate">{item.label}</span>
        </span>
        {isFolder && item.children!.length === 0 && (
          <span className="shrink-0 text-[10px] text-black/30" aria-hidden>
            ว่าง
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isFolder && open && item.children!.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <MenuTree items={item.children!} depth={depth + 1} onSelect={onSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Billo-style mega-menu: each row gets a tinted icon square, bold label
 * and a one-line description. Two-column grid for many items, single column
 * otherwise. Folders expand inline within their column.                */

const SUB_ICONS: Record<DockSubIconKind, TablerIcon> = {
  person: IconUser,
  people: IconUsers,
  stethoscope: IconStethoscope,
  pill: IconPill,
  vial: IconTestPipe,
  scan: IconScan,
  money: IconCash,
  wand: IconWand,
  calendar: IconCalendarEvent,
  home: IconHome,
  list: IconList,
  file: IconFileText,
  tooth: IconDental,
  checkup: IconHeartbeat,
  report: IconReportMedical,
};

interface MegaMenuProps {
  items: DockSubItem[];
  twoCol: boolean;
  onSelect: () => void;
}

function MegaMenu({ items, twoCol, onSelect }: MegaMenuProps) {
  if (!twoCol) {
    return (
      <ul className="flex flex-col gap-0.5">
        {items.map((it, i) => (
          <MegaRow key={i} item={it} onSelect={onSelect} />
        ))}
      </ul>
    );
  }
  // Split into two roughly even columns, preserving order.
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  return (
    <div className="grid grid-cols-2 gap-x-2">
      <ul className="flex flex-col gap-0.5">
        {left.map((it, i) => (
          <MegaRow key={`l${i}`} item={it} onSelect={onSelect} />
        ))}
      </ul>
      <ul className="flex flex-col gap-0.5">
        {right.map((it, i) => (
          <MegaRow key={`r${i}`} item={it} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

function MegaRow({ item, onSelect }: { item: DockSubItem; onSelect: () => void }) {
  const isFolder = !!item.children;
  const [open, setOpen] = useState(false);
  const Icon = item.iconHint ? SUB_ICONS[item.iconHint] : null;

  const handle = () => {
    if (isFolder) {
      setOpen((v) => !v);
      return;
    }
    item.onClick?.();
    onSelect();
  };

  return (
    <li>
      <button
        role={isFolder ? undefined : "menuitem"}
        aria-expanded={isFolder ? open : undefined}
        onClick={handle}
        className={`group flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition ${
          item.active ? "bg-black/[0.05]" : "hover:bg-black/[0.04]"
        }`}
      >
        {Icon ? (
          <span
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3485ff]/12 text-[#1e6fe6] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <span className="text-[11px]">·</span>
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-gray-900">
              {item.label}
            </span>
            {isFolder && (
              <motion.span
                aria-hidden
                className="shrink-0 text-[12px] text-black/40"
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                ›
              </motion.span>
            )}
          </span>
          {item.description && (
            <span className="truncate text-[11px] leading-snug text-gray-500">
              {item.description}
            </span>
          )}
          {isFolder && item.children!.length === 0 && (
            <span className="text-[10px] uppercase tracking-wider text-gray-400">
              ว่าง
            </span>
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isFolder && open && item.children!.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden pl-9"
          >
            <ul className="flex flex-col gap-0.5">
              {item.children!.map((c, i) => (
                <MegaRow key={i} item={c} onSelect={onSelect} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
