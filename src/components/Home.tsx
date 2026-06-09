import { useSidebar } from "../contexts/SidebarContext";
import { useTabs } from "../contexts/TabsContext";
import { useAiva } from "../contexts/AivaContext";
import {
  IconClipboardText,
  IconBuildingHospital,
  IconPlus,
  IconArrowRight,
} from "@tabler/icons-react";
import TileCard from "./TileCard";
import WidgetsSection from "./Home/Widgets/WidgetsSection";
import iconHealthcareCall from "../assets/figma/sidebar-icons/healthcare-call.svg?raw";
import iconFileShield from "../assets/figma/sidebar-icons/file-shield-02.svg?raw";

import EHP_AI_BANNER from "../assets/figma/ehp-ai-banner.png";
import HOME_BANNER_ELLIPSE from "../assets/figma/home-banner-ellipse.svg";
import HOME_FEATURE_DOTS from "../assets/figma/home-feature-dots.png";
import HOME_FEATURE_DOCTOR_PATIENT from "../assets/figma/home-feature-doctor-patient.png";
import CARD_TRACKING_SPIKES from "../assets/figma/card-tracking-spikes.png";
import CARD_TRACKING_OBJECT from "../assets/figma/card-tracking-object.png";

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
            // Match the global Notion-style sidebar width: 280px panel +
            // 16px gutter on each side = 312px when visible, 16px hidden.
            railHidden ? "ml-4" : "ml-[296px]",
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
            {/* Feature card — "บันทึกประวัติผู้ป่วยโดยไม่ต้องจด" per
                Figma 1069:1315. Wide horizontal card with a diagonal
                white-to-blue split; left half holds the AI badge + title
                + subtitle, right half shows the doctor / patient photo
                with a dotted circle decoration. */}
            <button
              type="button"
              onClick={() => openTab("/patient/new", { title: "ผู้ป่วยใหม่" })}
              className="group relative aspect-[626/203] rounded-3xl bg-[#0060eb] text-left transition duration-300 hover:brightness-[1.03]"
            >
              {/* AI aura — rotating conic-gradient ring + drop-shadow
                  glow. Uses the shared `.magic-ring` class so the look
                  matches the magic-search affordance elsewhere in the
                  app. Fades in on hover. */}
              <span
                aria-hidden
                className="magic-ring pointer-events-none absolute -inset-[3px] rounded-[28px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />

              {/* Card content — sits above the aura via stacking; the
                  inner overflow-clip stops the artwork bleeding past the
                  rounded corners while keeping the aura visible outside. */}
              <span className="absolute inset-0 overflow-hidden rounded-3xl">
              {/* White diagonal — triangle that covers the upper-left
                  region (cut from top-right corner to bottom-left). */}
              <svg
                aria-hidden
                viewBox="0 0 454 285"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-y-0 left-0 h-full w-[86%]"
              >
                <path d="M0 0H454L0 285V0Z" fill="#ffffff" />
              </svg>

              {/* Dotted circle decoration — top-right area */}
              <img
                src={HOME_FEATURE_DOTS}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none absolute -top-[24%] left-[47%] aspect-square w-[55%] object-cover"
              />

              {/* Doctor + patient photo — right half. Zooms in slightly
                  on hover, anchored at the bottom-left so the people
                  stay framed in view as the image grows. */}
              <img
                src={HOME_FEATURE_DOCTOR_PATIENT}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none absolute right-0 top-[10%] h-full w-[60%] origin-bottom-left object-cover object-left transition-transform duration-500 ease-out group-hover:scale-110"
              />

              {/* Text content — absolutely positioned on the white area
                  to match the Figma offsets (24, 24 / 24, 55 / 24, 135). */}
              <div className="absolute inset-y-0 left-0 flex flex-col gap-2 p-6">
                <span className="inline-flex w-fit items-center rounded-lg bg-[#1f1f1f]/10 px-3 py-1 text-[12px] font-bold text-[#1f1f1f]">
                  AI
                </span>
                <p className="text-[20px] font-bold leading-[1.4] text-[#1f1f1f]">
                  บันทึกประวัติผู้ป่วย
                  <br />
                  โดยไม่ต้องจด
                </p>
              </div>

              {/* Hover affordance — small "go to page" chip in the upper
                  right, fades + slides in on hover. Sits inside the clip
                  span so it stays inside the rounded card frame. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-4 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-white text-[#1f1f1f] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <IconArrowRight className="h-4 w-4" stroke={2.25} />
              </span>
              </span>
            </button>

            {/* Feature card — "สร้างการติดตามข้อมูลตามที่คุณสนใจ" per
                Figma 1080:1365. Yellow card with AI badge, two-line title,
                subtitle, and a rotated spike decoration anchored to the
                right (overflowing the card). Links to /dashboards where
                the user composes their own tracking dashboards. */}
            <button
              type="button"
              onClick={() => openTab("/dashboards", { title: "แดชบอร์ดของฉัน" })}
              className="group relative aspect-[626/203] rounded-3xl bg-[#f9b61a] text-left transition duration-300 hover:brightness-[1.03]"
            >
              {/* AI aura — same `.magic-ring` conic-gradient ring used by
                  the sibling blue card. Fades in on hover so both feature
                  tiles get the same affordance. */}
              <span
                aria-hidden
                className="magic-ring pointer-events-none absolute -inset-[3px] rounded-[28px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />

              {/* Clipped layers — yellow bg fill, white diagonal, and the
                  background spike all sit inside this overflow-hidden span
                  so they stay within the rounded card frame. */}
              <span className="absolute inset-0 overflow-hidden rounded-3xl">
                {/* White diagonal — upper-LEFT triangle, matches Figma
                    1053:2213 exactly: vertices (0,0), (454,0), (0,285),
                    SVG positioned left:0 w:454 (≈72% of 626 card width).
                    Text + AI badge sit on this white region; the right
                    portion stays yellow where the spike + doctor live. */}
                <svg
                  aria-hidden
                  viewBox="0 0 454 285"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-y-0 left-0 h-full w-[72%]"
                >
                  <path d="M0 0H454L0 285V0Z" fill="#ffffff" />
                </svg>

                {/* Orange spike — sits in the upper-right area at ~55%
                    from left per Figma 1074:1355 (left:343 top:-31
                    size:274 in a 626-wide card), rotated 165°. The PNG
                    has a transparent alpha channel, so it renders cleanly
                    on the yellow card without any blend-mode hack. */}
                <img
                  src={CARD_TRACKING_SPIKES}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pointer-events-none absolute -top-[15%] left-[55%] aspect-square w-[44%] rotate-[165deg] object-contain"
                />

                {/* Doctor + robot + monitor — INSIDE this overflow-hidden
                    span so anything past the rounded card frame is clipped.
                    Wrapper aspect 285:200 + `object-cover object-top` also
                    crops only the BOTTOM of the source asset (the desk/
                    keyboard area), matching the Figma frame. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 right-0 aspect-[285/200] h-[100%] overflow-hidden"
                >
                  <img
                    src={CARD_TRACKING_OBJECT}
                    alt=""
                    draggable={false}
                    className="h-full w-full origin-bottom object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                </div>
              </span>

              <div className="absolute inset-0 flex flex-col gap-2 p-6">
                <span className="inline-flex w-fit items-center rounded-lg bg-[#1f1f1f]/10 px-3 py-1 text-[12px] font-bold text-[#1f1f1f]">
                  AI
                </span>
                <p className="text-[20px] font-bold leading-[1.4] text-[#1f1f1f]">
                  สร้างการติดตามข้อมูล
                  <br />
                  ตามที่คุณสนใจ
                </p>
              </div>

              {/* Hover affordance — same "go to page" chip as the blue
                  card, tinted to read against the yellow surface. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-4 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-white text-[#1f1f1f] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <IconArrowRight className="h-4 w-4" stroke={2.25} />
              </span>
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
