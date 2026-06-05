import { useSidebar } from "../contexts/SidebarContext";
import { useTabs } from "../contexts/TabsContext";
import { useAiva } from "../contexts/AivaContext";
import {
  IconClipboardText,
  IconBuildingHospital,
  IconPlus,
  IconLayoutDashboard,
  IconChartLine,
  IconScan,
  IconMessage2,
} from "@tabler/icons-react";
import TileCard from "./TileCard";
import WidgetsSection from "./Home/Widgets/WidgetsSection";
import iconHealthcareCall from "../assets/figma/sidebar-icons/healthcare-call.svg?raw";
import iconFileShield from "../assets/figma/sidebar-icons/file-shield-02.svg?raw";

import EHP_AI_BANNER from "../assets/figma/ehp-ai-banner.png";
import HOME_BANNER_ELLIPSE from "../assets/figma/home-banner-ellipse.svg";
import ICON_RECORDS_MAIN from "../assets/figma/card-records-main.svg";
import ICON_TRACKING_MAIN from "../assets/figma/card-tracking-main.svg";

interface MenuCard {
  label: string;
  Icon?: typeof IconBuildingHospital;
  iconSrc?: string;
  /** Sidebar rail to open. Must match a `RailEntry.key` in Sidebar/config. */
  railKey: string;
  /** Optional child key inside the rail's panel — left blank for rail-only items. */
  childKey?: string;
  /** Optional route to open in a tab instead of a rail panel. */
  navigateTo?: string;
}

const FREQUENT_MENU: MenuCard[] = [
  {
    label: "ลงทะเบียนผู้ป่วยนอก",
    Icon: IconClipboardText,
    railKey: "opd",
    childKey: "register",
  },
  { label: "Telehealth", iconSrc: iconHealthcareCall, railKey: "telehealth" },
  {
    label: "One Stop Service",
    Icon: IconBuildingHospital,
    railKey: "workbench",
    childKey: "onestop",
  },
  { label: "Claims Submission", iconSrc: iconFileShield, railKey: "claims" },
];

export default function Home() {
  const { openTab } = useTabs();
  const {
    collapsed: sidebarCollapsed,
    railHidden,
    openMenu,
    openPalette,
    openCustomize,
    pushRecent,
  } = useSidebar();
  const { openAiva } = useAiva();

  const handleFrequentClick = (m: MenuCard) => {
    if (m.navigateTo) {
      openTab(m.navigateTo, { title: m.label });
    } else {
      openMenu(m.railKey, m.childKey);
    }
    const id = m.childKey ? `${m.railKey}:${m.childKey}` : m.railKey;
    pushRecent(id);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card (top-4 + h-16 = 80px) */}
      <div className="h-20 shrink-0" aria-hidden />

      <div className="w-full">
        {/* Main — left margin tracks the global Sidebar's collapsed/expanded
            width via SidebarContext so content reclaims space when the panel
            is hidden. */}
        <main
          className={[
            "flex min-w-0 flex-col gap-[var(--theme-space-md)] mr-[var(--theme-space-md)] pb-24 pt-[var(--theme-space-md)] transition-[margin] duration-300 ease-out",
            // Match the 16px gutter the sidebar and topbar use on every
            // edge: hidden = 16; collapsed = 16+74+16 = 106; expanded = 370.
            railHidden
              ? "ml-4"
              : sidebarCollapsed
                ? "ml-[106px]"
                : "ml-[370px]",
          ].join(" ")}
        >
          {/* Hero banner */}
          <div className="relative h-[224px] overflow-hidden rounded-[calc(var(--theme-radius-box)*1.5)] bg-gradient-to-r from-[#eff6ff] to-[#d1befe] ring-1 ring-inset ring-[var(--theme-neutral)]/15">
            {/* Decorative offset circle outline — 500×500 circle anchored
                vertically centered, sticking 337px past the right edge so
                only the left arc sweeps across the banner. */}
            <img
              src={HOME_BANNER_ELLIPSE}
              alt=""
              aria-hidden
              className="pointer-events-none absolute top-1/2 hidden h-[500px] w-[500px] -translate-y-1/2 opacity-30 md:block"
              style={{ right: "-337px" }}
            />

            {/* Left content — greeting + AI Assistant CTA */}
            <div className="absolute left-8 top-1/2 z-20 flex -translate-y-1/2 flex-col items-start gap-1">
              <p className="text-[length:var(--theme-text-sm)] font-medium text-[#1f1f1f]">
                สวัสดี, นพ.ราอูล มันเมาะ
              </p>
              <p className="text-[length:var(--theme-text-xl)] font-bold leading-tight text-[#1f1f1f]">
                โรงพยาบาลทดสอบ BMS
              </p>
              <p className="text-[length:var(--theme-text-sm)] text-[#1f1f1f]">201 ประชาสัมพันธ์ สาขา BMS</p>
              <button
                type="button"
                onClick={() => openAiva()}
                className="mt-[var(--theme-space-md)] inline-flex cursor-pointer items-center rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-[var(--theme-space-lg)] py-[var(--theme-space-sm)] text-[length:var(--theme-text-md)] font-semibold text-white transition hover:bg-[var(--theme-primary)]/85"
              >
                พูดคุยกับหมอเมย์ • AI Assistant
              </button>
            </div>

            {/* Illustration — single image with rounded shape + AI badge
                baked in. Anchored to the right edge of the banner. */}
            <img
              src={EHP_AI_BANNER}
              alt=""
              decoding="async"
              className="pointer-events-none absolute right-0 top-1/2 hidden h-[85%] w-auto -translate-y-[55%] object-contain object-right md:block"
            />
          </div>

          {/* Feature cards row */}
          <div className="grid grid-cols-1 gap-[var(--theme-space-md)] md:grid-cols-2">
            <button
              type="button"
              onClick={() => openTab("/patient/new", { title: "ผู้ป่วยใหม่" })}
              className="relative overflow-hidden rounded-[calc(var(--theme-radius-box)*1.5)] bg-[var(--theme-primary)] p-[var(--theme-space-md)] text-left transition"
            >
              <div className="relative z-10 flex w-[270px] flex-col gap-[var(--theme-space-md)] text-white">
                <img
                  src={ICON_RECORDS_MAIN}
                  alt=""
                  className="h-12 w-12"
                  draggable={false}
                />
                <p className="text-[length:var(--theme-text-md)] font-bold leading-tight">
                  บันทึกประวัติผู้ป่วยอัตโนมัติ
                </p>
                <div className="flex flex-col gap-[var(--theme-space-md)]">
                  <div className="flex items-start gap-2 text-[length:var(--theme-text-sm)]">
                    <IconScan className="h-5 w-5 shrink-0" stroke={1.75} />
                    <span>สแกนบัตรประจำตัวประชาชน</span>
                  </div>
                  <div className="flex items-start gap-2 text-[length:var(--theme-text-sm)]">
                    <IconMessage2 className="h-5 w-5 shrink-0" stroke={1.75} />
                    <span>ซักประวัติผู้ป่วย</span>
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openAiva()}
              className="relative overflow-hidden rounded-[calc(var(--theme-radius-box)*1.5)] bg-[var(--theme-accent)] p-[var(--theme-space-md)] text-left transition"
            >
              <div className="relative z-10 flex w-[270px] flex-col gap-[var(--theme-space-md)] text-white">
                <img
                  src={ICON_TRACKING_MAIN}
                  alt=""
                  className="h-12 w-12"
                  draggable={false}
                />
                <p className="text-[length:var(--theme-text-md)] font-bold leading-tight">
                  ติดตามผู้ป่วยอัจฉริยะ
                </p>
                <div className="flex flex-col gap-[var(--theme-space-md)]">
                  <div className="flex items-start gap-2 text-[length:var(--theme-text-sm)]">
                    <IconLayoutDashboard className="h-5 w-5 shrink-0" stroke={1.75} />
                    <span>สร้างแดชบอร์ดตามข้อมูลที่คุณสนใจ</span>
                  </div>
                  <div className="flex items-start gap-2 text-[length:var(--theme-text-sm)]">
                    <IconChartLine className="h-5 w-5 shrink-0" stroke={1.75} />
                    <span>วิเคราะห์และสรุปข้อมูลสุขภาพ</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Frequent menu */}
          <section className="flex flex-col gap-[var(--theme-space-md)]">
            <div className="flex items-center justify-between text-[length:var(--theme-text-sm)] font-medium">
              <p className="text-[var(--theme-neutral)]/60">เมนูที่ใช้บ่อย</p>
              <button
                type="button"
                onClick={openCustomize}
                className="text-[var(--theme-primary)] hover:underline"
              >
                จัดการเมนู
              </button>
            </div>
            <div className="grid grid-cols-2 gap-[var(--theme-space-md)] sm:grid-cols-3 lg:grid-cols-5">
              {FREQUENT_MENU.slice(0, 4).map((m) => (
                <TileCard
                  key={m.label}
                  title={m.label}
                  Icon={m.Icon}
                  iconSrc={m.iconSrc}
                  onClick={() => handleFrequentClick(m)}
                />
              ))}
              <TileCard
                title="เพิ่มเมนู"
                Icon={IconPlus}
                variant="dashed"
                onClick={openPalette}
              />
            </div>
          </section>

          <WidgetsSection />

        </main>
      </div>
    </div>
  );
}
