import { useNavigate } from "react-router";
import { motion, type Variants } from "framer-motion";
import { useSidebar } from "../contexts/SidebarContext";
import MagicSearch from "./MagicSearch";
import {
  IconUserPlus,
  IconVideo,
  IconBuildingHospital,
  IconReceipt2,
  IconPlus,
} from "@tabler/icons-react";

import HERO_BG from "../assets/figma/home-hero-bms.jpg";
import CARD_RECORDS from "../assets/figma/home-card-records.svg";
import CARD_TRACKING from "../assets/figma/home-card-tracking.png";
import ICON_RECORDS_MAIN from "../assets/figma/card-records-main.svg";
import ICON_RECORDS_BULLET_1 from "../assets/figma/card-records-bullet-1.svg";
import ICON_RECORDS_BULLET_2 from "../assets/figma/card-records-bullet-2.svg";
import ICON_TRACKING_MAIN from "../assets/figma/card-tracking-main.svg";
import ICON_TRACKING_BULLET_1 from "../assets/figma/card-tracking-bullet-1.svg";
import ICON_TRACKING_BULLET_2 from "../assets/figma/card-tracking-bullet-2.svg";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_TV } },
};

const stagger = (delay = 0, step = 0.05): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: step } },
});

interface MenuCard {
  label: string;
  Icon: typeof IconUserPlus;
  tint: string;
  primary?: boolean;
}

const FREQUENT_MENU: MenuCard[] = [
  { label: "ลงทะเบียนผู้ป่วยนอก", Icon: IconUserPlus, tint: "bg-[#3485ff]", primary: true },
  { label: "Telehealth", Icon: IconVideo, tint: "bg-[#8a8a8a]" },
  { label: "One Stop Service", Icon: IconBuildingHospital, tint: "bg-[#8a8a8a]" },
  { label: "Claims Submission", Icon: IconReceipt2, tint: "bg-[#8a8a8a]" },
];

const NEWS: { title: string; tag: string }[] = [
  { title: "ลงทะเบียนผู้ป่วยนอก", tag: "OPD" },
  { title: "Telehealth", tag: "OPD" },
  { title: "One Stop Service", tag: "OPD" },
  { title: "Claims Submission", tag: "OPD" },
  { title: "ลงทะเบียนผู้ป่วยนอก", tag: "OPD" },
];

export default function Home() {
  const navigate = useNavigate();
  const { collapsed: sidebarCollapsed } = useSidebar();

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
            "flex min-w-0 flex-col gap-6 mr-4 pb-24 pt-4 transition-[margin] duration-300 ease-out",
            // Match the 16px gutter the sidebar and topbar use on every
            // edge: collapsed = 16+74+16 = 106; expanded = 16+383+16 = 415.
            sidebarCollapsed ? "lg:ml-[106px]" : "lg:ml-[415px]",
          ].join(" ")}
        >
          {/* Hero banner */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="relative h-[200px] overflow-hidden rounded-3xl"
          >
            <img
              src={HERO_BG}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-white/40 via-black/40 to-[#3a3a3a]/60" />
            <div className="relative flex h-full flex-col justify-start gap-1 p-6 text-white [text-shadow:0_4px_4px_rgba(0,0,0,0.25)]">
              <p className="text-[14px] font-medium">สวัสดี, นพ.ราอูล มันเมาะ</p>
              <p className="text-[24px] font-bold leading-tight">โรงพยาบาลทดสอบ BMS</p>
              <p className="text-[14px]">201 ประชาสัมพันธ์ สาขา BMS</p>
            </div>
          </motion.div>

          {/* Floating AI prompt bar — vertically centered on the hero /
              feature-card boundary. Form is ~72px tall, so `-mt-[60px]`
              (gap-6 = 24 + half-form = 36) puts its centerline on the seam. */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="relative z-10 -mt-[60px] self-center"
          >
            <MagicSearch />
          </motion.div>

          {/* Feature cards row */}
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <motion.button
              variants={fadeUp}
              type="button"
              onClick={() => navigate("/patient/new")}
              className="relative h-[243px] overflow-hidden rounded-3xl bg-[#3965e1] p-6 text-left shadow-lg transition hover:shadow-xl"
            >
              <div className="relative z-10 flex w-[270px] flex-col gap-4 text-white">
                <img
                  src={ICON_RECORDS_MAIN}
                  alt=""
                  className="h-16 w-16"
                  draggable={false}
                />
                <p className="text-[20px] font-bold leading-tight">
                  บันทึกประวัติผู้ป่วยอัตโนมัติ
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-2 text-[16px]">
                    <img
                      src={ICON_RECORDS_BULLET_1}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      draggable={false}
                    />
                    <span>สแกนบัตรประจำตัวประชาชน</span>
                  </div>
                  <div className="flex items-start gap-2 text-[16px]">
                    <img
                      src={ICON_RECORDS_BULLET_2}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      draggable={false}
                    />
                    <span>ซักประวัติผู้ป่วย</span>
                  </div>
                </div>
              </div>
              <img
                src={CARD_RECORDS}
                alt=""
                className="pointer-events-none absolute -right-2 top-2 h-[230px] w-auto object-contain opacity-95"
              />
            </motion.button>

            <motion.button
              variants={fadeUp}
              type="button"
              onClick={() => navigate("/ai")}
              className="relative h-[243px] overflow-hidden rounded-3xl bg-[#f8672c] p-6 text-left shadow-lg transition hover:shadow-xl"
            >
              <div className="relative z-10 flex w-[270px] flex-col gap-4 text-white">
                <img
                  src={ICON_TRACKING_MAIN}
                  alt=""
                  className="h-16 w-16"
                  draggable={false}
                />
                <p className="text-[20px] font-bold leading-tight">
                  ติดตามผู้ป่วยอัจฉริยะ
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-2 text-[16px]">
                    <img
                      src={ICON_TRACKING_BULLET_1}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      draggable={false}
                    />
                    <span>สร้างแดชบอร์ดตามข้อมูลที่คุณสนใจ</span>
                  </div>
                  <div className="flex items-start gap-2 text-[16px]">
                    <img
                      src={ICON_TRACKING_BULLET_2}
                      alt=""
                      className="h-6 w-6 shrink-0"
                      draggable={false}
                    />
                    <span>วิเคราะห์และสรุปข้อมูลสุขภาพ</span>
                  </div>
                </div>
              </div>
              <img
                src={CARD_TRACKING}
                alt=""
                className="pointer-events-none absolute -right-3 top-2 h-[230px] w-auto object-contain"
              />
            </motion.button>
          </motion.div>

          {/* Frequent menu */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-[14px] font-medium">
              <p className="text-[var(--theme-neutral)]/60">เมนูที่ใช้บ่อย</p>
              <button type="button" className="text-[var(--theme-primary)] hover:underline">
                จัดการเมนู
              </button>
            </div>
            <motion.div
              variants={stagger(0.05)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            >
              {FREQUENT_MENU.map((m) => (
                <motion.button
                  key={m.label}
                  variants={fadeUp}
                  type="button"
                  className="flex h-[119px] flex-col items-start justify-between rounded-3xl bg-[var(--theme-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.tint} text-white`}
                  >
                    <m.Icon className="h-5 w-5" stroke={1.75} />
                  </div>
                  <p className="text-[14px] font-bold text-[#1f1f1f]">{m.label}</p>
                </motion.button>
              ))}
              <motion.button
                variants={fadeUp}
                type="button"
                className="flex h-[119px] flex-col items-start justify-between rounded-3xl border border-dashed border-[var(--theme-neutral)]/15 p-4 text-left transition hover:bg-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d9d9d9] text-white">
                  <IconPlus className="h-5 w-5" stroke={2} />
                </div>
                <p className="text-[14px] font-bold text-[#1f1f1f]">เพิ่มเมนู</p>
              </motion.button>
            </motion.div>
          </section>

          {/* News */}
          <section className="flex flex-col gap-4">
            <p className="text-[14px] font-medium text-[var(--theme-neutral)]/60">ข่าวและประชาสัมพันธ์</p>
            <motion.div
              variants={stagger(0.05)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            >
              {NEWS.map((n, i) => (
                <motion.button
                  key={i}
                  variants={fadeUp}
                  type="button"
                  className="flex h-[119px] flex-col items-start justify-between rounded-3xl bg-[var(--theme-surface)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef3ff] text-[10px] font-bold text-[#3485ff]">
                    {n.tag}
                  </div>
                  <p className="text-[14px] font-bold text-[#1f1f1f]">{n.title}</p>
                </motion.button>
              ))}
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}
