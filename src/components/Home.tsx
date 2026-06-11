import { useEffect, useState } from "react";
import { useSidebar } from "../contexts/SidebarContext";
import { useTabs } from "../contexts/TabsContext";
import { useAiva } from "../contexts/AivaContext";
import {
  IconClipboardText,
  IconBuildingHospital,
  IconPlus,
  IconArrowRight,
  IconMicrophone,
  IconSparkles,
} from "@tabler/icons-react";
import TileCard from "./TileCard";
import WidgetsSection from "./Home/Widgets/WidgetsSection";
import { RAIL_LIST } from "./Sidebar/config";
import type { RailEntry } from "./Sidebar/types";
import iconHealthcareCall from "../assets/figma/sidebar-icons/healthcare-call.svg?raw";
import iconFileShield from "../assets/figma/sidebar-icons/file-shield-02.svg?raw";

import HERO_DOCTOR from "../assets/figma/hero-doctor.png";
import BANNER_BG_CIRCLE from "../assets/figma/banner-bg-circle.png";
import HERO_WAVE from "../assets/figma/hero-wave.svg";
import HOME_FEATURE_DOTS from "../assets/figma/home-feature-dots.png";
import HOME_FEATURE_DOCTOR_PATIENT from "../assets/figma/home-feature-doctor-patient.png";
import CARD_TRACKING_SPIKES from "../assets/figma/card-tracking-spikes.png";
import CARD_TRACKING_OBJECT from "../assets/figma/card-tracking-object.png";

const SEARCH_EXAMPLES = [
  "สรุปผู้ป่วยสมชาย ใจดี",
  "สร้างแดชบอร์ดเบาหวาน HbA1c",
  "คนไข้ขาดนัด 30 วันล่าสุด",
  "ผลแลปผิดปกติวันนี้",
  "ตารางคิว OPD บ่ายนี้",
];

/** Typewriter — cycles through `phrases`, typing each char-by-char,
 *  holding for a beat, then erasing. Hook returns just the current text;
 *  the caller renders it however it likes. */
function useTypewriter(
  phrases: string[],
  typeMs = 60,
  holdMs = 1600,
  eraseMs = 30,
): string {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");

  useEffect(() => {
    const target = phrases[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "type") {
      if (text.length < target.length) {
        timer = setTimeout(() => setText(target.slice(0, text.length + 1)), typeMs);
      } else {
        timer = setTimeout(() => setPhase("hold"), holdMs);
      }
    } else if (phase === "hold") {
      timer = setTimeout(() => setPhase("erase"), 0);
    } else if (phase === "erase") {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, -1)), eraseMs);
      } else {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setPhase("type");
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, phraseIdx, phrases, typeMs, holdMs, eraseMs]);

  return text;
}

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
  const typedExample = useTypewriter(SEARCH_EXAMPLES);
  const {
    railHidden,
    openMenu,
    openPalette,
    openCustomize,
    pushRecent,
    favoriteRails,
  } = useSidebar();
  const { openAiva } = useAiva();

  // Resolve favorite rail keys to their RailEntry definitions, preserving
  // the user's favorite order.
  const favoriteEntries: RailEntry[] = favoriteRails
    .map((k) => RAIL_LIST.find((r) => r.key === k))
    .filter((r): r is RailEntry => !!r);

  const handleFavoriteClick = (rail: RailEntry) => {
    if (rail.navigateTo) {
      openTab(rail.navigateTo, { title: rail.label });
    } else {
      openMenu(rail.key);
    }
    pushRecent(rail.key);
  };

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
      <div className="h-16 shrink-0" aria-hidden />

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
          {/* Hero banner — per Figma 941:13736. White card with a
              subtle blue wave on the left, a doctor-with-laptop illustration
              anchored to the right edge, and an AI prompt pill near the
              bottom that opens Mae. */}
          {/* The decorative wave (Figma 1080:1517) is applied as a CSS
              background-image instead of an inline `<img>` — same asset,
              but lives in the banner's background layer so we don't have
              a stray image element to position. `background-size` of
              ~103.5% × ~107.5% mirrors Figma's inset offsets so the
              curve sweeps across the full width and the bottom edge
              bleeds out of the rounded card. */}
          <div
            className="relative h-[212px] overflow-hidden rounded-[32px] bg-[var(--theme-surface)]"
            // Background layers, bottom-up:
            //   1. theme surface color (declared on the class).
            //   2. abstract blue wave (Figma 1080:1517) — anchored left
            //      so the curve starts at the left edge and sweeps right.
            // `clip-path` also enforces the rounded corner mask so child
            // images with their own z-index can't leak past the corners.
            style={{
              backgroundImage: `url(${HERO_WAVE})`,
              backgroundRepeat: "no-repeat",
              // Figma 1080:1517 positions the vector with `inset:
              // 0 -3.24% -7.51% -0.22%`, so the artwork stretches across
              // the full banner plus a slight overflow on the right and
              // bottom. Mirror those exact offsets so the wave + the
              // vertical-stroke tail on the right both line up.
              backgroundPosition: "-0.22% 0",
              backgroundSize: "103.46% 107.51%",
              clipPath: "inset(0 round 32px)",
            }}
          >

            {/* Greeting — top-left. */}
            <div className="absolute left-8 top-[31px] z-20 flex flex-col gap-1">
              <p className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                สวัสดี, นพ.ราอูล มันเมาะ
              </p>
              <p className="text-[24px] font-bold leading-tight text-[var(--theme-neutral)]">
                โรงพยาบาลทดสอบ BMS
              </p>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]">
                201 ประชาสัมพันธ์ สาขา BMS
              </p>
            </div>

            {/* Blue speckled arc — single asset that fills the right
                portion of the banner. Anchored to the right edge with
                bottom flush so the speckle bleeds into the rounded
                bottom-right corner. */}
            <img
              src={BANNER_BG_CIRCLE}
              alt=""
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-auto md:block"
            />

            {/* Decorative outline circle — sits ABOVE the blue spikes so
                the ring overlays them. Same dimensions as before. */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 z-10 hidden h-[500px] w-[500px] -translate-y-1/2 rounded-full border border-[#314DAD] md:block"
              style={{ right: "-337px" }}
            />

            {/* Doctor with laptop — anchored to the right edge. The AI
                bubble overlay is baked into the asset, so this is a single
                image instead of separate layers. */}
            <img
              src={HERO_DOCTOR}
              alt=""
              aria-hidden
              decoding="async"
              className="pointer-events-none absolute right-0 top-1/2 z-[15] hidden h-[80%] w-auto -translate-y-[58%] object-contain object-right md:block"
            />

            {/* AI prompt pill — bottom-left. Click to open Mae with the
                prompt prefilled. */}
            <button
              type="button"
              onClick={() => openAiva(typedExample || undefined)}
              className="group absolute left-8 bottom-6 z-20 flex w-[520px] max-w-[calc(100%-360px)] cursor-pointer items-center gap-6 rounded-full border border-[#9db6fb] bg-[var(--theme-surface)] py-2 pl-6 pr-3 text-left shadow-[0_2px_8px_-2px_rgba(15,82,251,0.08)] transition hover:border-[var(--theme-primary)]"
            >
              <span className="flex min-w-0 flex-1 items-baseline gap-2 truncate text-[length:var(--theme-text-md)]">
                <span className="text-[var(--theme-neutral)]/45">ค้นหาอะไรก็ได้</span>
                <span className="truncate text-[var(--theme-neutral)]/85">
                  {typedExample}
                  <span
                    aria-hidden
                    className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[1px] align-middle bg-[var(--theme-neutral)]/55 animate-pulse"
                  />
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <IconMicrophone
                  className="h-5 w-5 text-[var(--theme-neutral)]/65"
                  stroke={1.75}
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black transition group-hover:scale-105">
                  <IconSparkles className="h-5 w-5 text-white" stroke={1.75} />
                </span>
              </span>
            </button>
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
              className="group relative aspect-[626/203] rounded-3xl text-left transition duration-300 hover:brightness-[1.03]"
            >
              {/* AI aura — rotating conic-gradient ring + drop-shadow
                  glow. Uses the shared `.magic-ring` class so the look
                  matches the magic-search affordance elsewhere in the
                  app. Fades in on hover. */}
              <span
                aria-hidden
                className="magic-ring pointer-events-none absolute -inset-[3px] hidden rounded-[28px] group-hover:block"
              />

              {/* Card content — sits above the aura via stacking. The
                  blue base color lives on THIS span (not the button) so
                  the rounded corner has a single source — no thin blue
                  sliver showing where two rounded layers misalign. */}
              <span className="absolute inset-0 overflow-hidden rounded-3xl bg-[#0060eb]">
              {/* White diagonal — triangle that covers the upper-left
                  region (cut from top-right corner to bottom-left). Done
                  with `clip-path: polygon(...)` on a white div so no
                  inline SVG is needed. Polygon vertices match the old
                  SVG path `M0 0 H454 L0 285` mapped to this overlay's
                  86%×100% box. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[var(--theme-surface)]"
                style={{ clipPath: "polygon(0 0, 86% 0, 0 100%)" }}
              />

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
                <span className="inline-flex w-fit items-center rounded-lg bg-[var(--theme-neutral)]/10 px-3 py-1 text-[12px] font-bold text-[var(--theme-neutral)]">
                  AI
                </span>
                <p className="text-[20px] font-bold leading-[1.4] text-[var(--theme-neutral)]">
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
                className="pointer-events-none absolute right-4 top-4 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-neutral)] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
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
              className="group relative aspect-[626/203] rounded-3xl text-left transition duration-300 hover:brightness-[1.03]"
            >
              {/* AI aura — same `.magic-ring` conic-gradient ring used by
                  the sibling blue card. Fades in on hover so both feature
                  tiles get the same affordance. */}
              <span
                aria-hidden
                className="magic-ring pointer-events-none absolute -inset-[3px] hidden rounded-[28px] group-hover:block"
              />

              {/* Clipped layers — yellow base fill, white diagonal, and
                  the background spike all sit inside this overflow-hidden
                  span. The brand color lives on this span (not the
                  button) so the rounded corner has a single source — no
                  thin yellow sliver showing where two rounded layers
                  misalign. */}
              <span className="absolute inset-0 overflow-hidden rounded-3xl bg-[#f9b61a]">
                {/* White diagonal — upper-left triangle (matches Figma
                    1053:2213). Implemented with `clip-path: polygon(...)`
                    on a white div instead of inline SVG. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[var(--theme-surface)]"
                  style={{ clipPath: "polygon(0 0, 72% 0, 0 100%)" }}
                />

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
                <span className="inline-flex w-fit items-center rounded-lg bg-[var(--theme-neutral)]/10 px-3 py-1 text-[12px] font-bold text-[var(--theme-neutral)]">
                  AI
                </span>
                <p className="text-[20px] font-bold leading-[1.4] text-[var(--theme-neutral)]">
                  สร้างการติดตามข้อมูล
                  <br />
                  ตามที่คุณสนใจ
                </p>
              </div>

              {/* Hover affordance — same "go to page" chip as the blue
                  card, tinted to read against the yellow surface. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-4 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-neutral)] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <IconArrowRight className="h-4 w-4" stroke={2.25} />
              </span>
            </button>
          </div>

          {/* Favorite menus — user-picked tiles, shown above the frequent
              menu so they're the first thing the doctor sees. */}
          {favoriteEntries.length > 0 && (
            <section className="flex flex-col gap-[var(--theme-space-md)]">
              <div className="flex items-center justify-between text-[length:var(--theme-text-sm)] font-medium">
                <p className="text-[var(--theme-neutral)]/60">เมนูโปรด</p>
                <button
                  type="button"
                  onClick={openCustomize}
                  className="text-[var(--theme-primary)] hover:underline"
                >
                  จัดการ
                </button>
              </div>
              <div className="grid grid-cols-2 gap-[var(--theme-space-md)] sm:grid-cols-3 lg:grid-cols-5">
                {favoriteEntries.map((rail) => (
                  <TileCard
                    key={rail.key}
                    title={rail.label}
                    Icon={rail.Icon}
                    iconSrc={rail.iconSrc}
                    onClick={() => handleFavoriteClick(rail)}
                  />
                ))}
              </div>
            </section>
          )}

          <WidgetsSection />

        </main>
      </div>
    </div>
  );
}
