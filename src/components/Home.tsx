import { Button } from "@heroui/react";
import {
  BellDot,
  CircleUser,
  StickyNote,
  UserPlus,
  ClockFading,
  UserRoundCheck,
  FolderPlus,
  Star,
  Home as HomeIcon,
  ClipboardList,
  Calendar,
  FolderOpen,
  Stethoscope,
  Shield,
  Activity,
  Blocks,
  Sparkles,
} from "lucide-react";

const HERO_BG =
  "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=2000&q=80";

const MENU_IMAGES = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1631815587646-b85a1bb027e1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=600&q=80",
];

const FREQUENT_MENU = [
  { label: "Doctor Summary", img: MENU_IMAGES[0] },
  { label: "เวชระเบียนผู้ป่วย", img: MENU_IMAGES[1] },
  { label: "One Stop Service", img: MENU_IMAGES[2] },
  { label: "Telehealth", img: MENU_IMAGES[3] },
  { label: "Claims Submission", img: MENU_IMAGES[4] },
];

const ALL_MENU = [
  "Doctor Summary",
  "เวชระเบียนผู้ป่วย",
  "One Stop Service",
  "Telehealth",
  "Claims Submission",
  "Pharmacy",
  "Lab Results",
  "Imaging",
  "Appointments",
  "Billing",
  "Inventory",
  "Reports",
  "Admin",
  "Settings",
  "Help Center",
];

const SIDE_NAV = [
  { icon: HomeIcon, label: "Home", active: true },
  { icon: ClipboardList, label: "OPD" },
  { icon: Calendar, label: "Appointments" },
  { icon: FolderOpen, label: "Records" },
  { icon: Stethoscope, label: "Doctor" },
  { icon: Shield, label: "Insurance" },
  { icon: Activity, label: "Vitals", divider: true },
  { icon: Blocks, label: "Apps" },
];

function MenuCard({ label, img }: { label: string; img: string }) {
  return (
    <button
      className="group relative aspect-square overflow-hidden rounded-[40px] shadow-[0_4px_24px_rgba(0,0,0,0.25)] text-left transition hover:scale-[1.02]"
    >
      <img
        src={img}
        alt={label}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-2xl font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">
          {label}
        </p>
      </div>
    </button>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      {/* Hero background image with overlay */}
      <div className="fixed inset-0 z-0">
        <img
          src={HERO_BG}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-white/40 via-black/40 to-[#3a3a3a]/40" />
      </div>
      <div className="relative z-10">

      {/* Top navigation */}
      <header className="sticky top-0 z-30 h-[100px]">
        <div className="mx-auto flex h-full max-w-[1392px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 48 48"
              className="h-12 w-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <path
                d="M24 4c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z"
                fill="#E94B4B"
              />
              <rect x="21" y="12" width="6" height="16" rx="1" fill="#fff" />
              <rect x="16" y="17" width="16" height="6" rx="1" fill="#fff" />
            </svg>
            <div className="leading-tight">
              <p className="text-[13px] font-extrabold tracking-wide text-[#2BC480] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                EXCELLENT
              </p>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#2BC480] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                HEALTH PLATFORM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-16 w-16 items-center justify-center rounded-[32px] bg-white shadow">
              <BellDot className="h-6 w-6" />
            </button>
            <button className="flex h-[56px] items-center gap-2 rounded-full bg-white px-6 py-3 shadow">
              <CircleUser className="h-6 w-6" />
              <span className="text-base font-medium">นพ. ชารีฟ ราอูล</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-[1432px] flex-col gap-6 px-6 pb-60 pt-4">
        {/* Hero row: greeting + stat cards */}
        <section className="flex h-[360px] items-center gap-9">
          {/* Greeting + CTA buttons */}
          <div className="flex w-[472px] flex-col gap-4">
            <p className="text-2xl font-medium text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
              สวัสดี, นพ. ชารีฟ ราอูล
            </p>
            <p className="text-[36px] font-bold leading-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
              โรงพยาบาลทดสอบ BMS
            </p>
            <p className="text-xl text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              201 ประชาสัมพันธ์ สาขา BMS
            </p>
            <Button
              radius="full"
              size="lg"
              className="h-14 w-full bg-[#3485ff] text-base font-medium text-white"
              startContent={<StickyNote className="h-6 w-6" />}
            >
              ลงทะเบียนผู้ป่วยใหม่
            </Button>
            <Button
              radius="full"
              size="lg"
              className="h-14 w-full bg-[#f2f2f2] text-base font-medium text-black"
              startContent={<UserPlus className="h-6 w-6" />}
            >
              สร้าง Visit ใหม่
            </Button>
          </div>

          {/* Stat cards */}
          <div className="flex h-full flex-1 gap-6">
            {/* Today's patients - large left card */}
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[40px] border border-white/50 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
                 style={{ width: 280 }}>
              <img
                src="https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=800&q=80"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
              <div className="relative flex flex-1 flex-col">
                <p className="text-2xl font-medium text-white">ผู้ป่วยวันนี้</p>
                <div className="flex items-end gap-2">
                  <p className="text-[96px] font-bold leading-none text-white">20</p>
                  <p className="pb-4 text-xl text-white/80">ราย</p>
                </div>
              </div>
              <p className="relative text-base text-white/80">
                มากกว่าเมื่อวาน 4 ราย
              </p>
            </div>

            {/* Right column with 3 cards */}
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex flex-1 gap-6">
                {/* Waiting */}
                <div className="relative flex flex-1 flex-col justify-between rounded-[40px] bg-gradient-to-b from-[#ffd268] to-[#ffb300] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                  <ClockFading className="absolute right-4 top-4 h-16 w-16 text-white/90" />
                  <div>
                    <p className="text-xl font-medium text-white">รอตรวจ</p>
                    <div className="flex items-end gap-2">
                      <p className="text-5xl font-medium leading-none text-white">5</p>
                      <p className="pb-1 text-xl text-white/80">ราย</p>
                    </div>
                  </div>
                  <p className="text-base text-white/80">ลดลงจากชั่วโมงก่อน</p>
                </div>

                {/* Completed */}
                <div className="relative flex flex-1 flex-col justify-between rounded-[40px] bg-gradient-to-b from-[#64ef79] to-[#3eaf3f] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                  <UserRoundCheck className="absolute right-4 top-4 h-16 w-16 text-white/90" />
                  <div>
                    <p className="text-xl font-medium text-white">ตรวจเสร็จ</p>
                    <div className="flex items-end gap-2">
                      <p className="text-5xl font-medium leading-none text-white">15</p>
                      <p className="pb-1 text-xl text-white/80">ราย</p>
                    </div>
                  </div>
                  <p className="text-base text-white/80">80% ของผู้ป่วยวันนี้</p>
                </div>
              </div>

              {/* New patients - wide bottom card */}
              <div className="relative flex flex-1 flex-col justify-center gap-2 rounded-[40px] bg-gradient-to-b from-[#98c1ff] to-[#2d82ff] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                <FolderPlus className="absolute right-6 top-1/2 h-[124px] w-[124px] -translate-y-1/2 text-white/90" />
                <p className="text-2xl font-bold text-white">ผู้ป่วยใหม่</p>
                <div className="flex items-end gap-2">
                  <p className="text-5xl font-medium leading-none text-white">3</p>
                  <p className="pb-1 text-xl text-white/80">ราย</p>
                </div>
                <p className="text-base text-white/80">ลงทะเบียนเข้าระบบวันนี้</p>
              </div>
            </div>
          </div>
        </section>

        {/* Frequently used menu */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              เมนูที่ใช้บ่อย
            </h2>
            <Button
              radius="full"
              className="h-12 bg-white px-6 text-base font-medium text-black"
              startContent={<Star className="h-6 w-6" />}
            >
              ตั้งค่าเมนู
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-6">
            {FREQUENT_MENU.map((m) => (
              <MenuCard key={m.label} label={m.label} img={m.img} />
            ))}
          </div>
        </section>

        {/* All menus */}
        <section className="flex flex-col gap-4 pb-40">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              เมนูทั้งหมด
            </h2>
            <Button
              radius="full"
              className="h-12 bg-white px-6 text-base font-medium text-black"
              startContent={<Star className="h-6 w-6" />}
            >
              ตั้งค่าเมนู
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-6">
            {ALL_MENU.map((label, i) => (
              <MenuCard key={`${label}-${i}`} label={label} img={MENU_IMAGES[i]} />
            ))}
          </div>
        </section>
      </main>

      {/* Floating bottom horizontal nav */}
      <nav className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          {SIDE_NAV.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                {item.divider && (
                  <div className="mx-1 h-10 w-px rounded-full bg-[#d9d9d9]" />
                )}
                <button
                  className={`flex h-16 w-16 items-center justify-center rounded-[36px] transition ${
                    item.active
                      ? "bg-black text-white"
                      : "bg-black/5 text-black hover:bg-black/10"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-6 w-6" />
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Floating AI mic button */}
      <button
        className="group fixed bottom-8 right-8 z-30 flex h-[103px] w-[103px] items-center justify-center rounded-full shadow-[0_8px_32px_rgba(106,76,255,0.5)] transition hover:scale-105"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #c5a4ff, #6a4cff 60%, #3b1eaa)",
        }}
        aria-label="AI assistant"
      >
        <Sparkles className="h-9 w-9 text-white drop-shadow" />
      </button>
      </div>
    </div>
  );
}
