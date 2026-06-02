import { useLocation, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconMicrophone,
  IconSearch,
  IconPlus,
  IconFileText,
  IconScan,
  IconStethoscope,
  IconClipboardText,
  IconReportMedical,
  IconHash,
  IconPaperclip,
  IconPhoto,
  IconFileUpload,
  IconCamera,
  IconId,
} from "@tabler/icons-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";
import { useDictationContext } from "../contexts/DictationContext";
import BorderGlow from "./BorderGlow";
import AI_DOCTOR from "../assets/figma/ai-mode-doctor.png";
import AI_CARD_SCAN from "../assets/figma/ai-card-scan.png";
import AI_CARD_ICON from "../assets/figma/ai-card-icon.svg";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// 2 × 2 feature cards — each card has a Thai title, two bullet rows, and a
// decorative isometric "document scan" sticker on the right side. Modeled
// after the Figma design (node 826:4227).
interface FeatureCard {
  title: string;
  bullets: { icon: typeof IconScan; label: string }[];
  onClick?: () => void;
}

// Apple-keynote-style intro story — phrases cross-fade with a soft blur
// clear + upward drift. The persona name is the climax: the Thai "เมย์"
// morphs into the English "May" via a longer dwell step that stacks both
// glyphs in place and cross-fades them with a slight scale/blur swap.
type IntroPhrase =
  | { kind: "text"; text: string; lang: "th" | "en"; ms?: number }
  | { kind: "morph"; from: string; to: string; lead?: string; ms: number };

const INTRO_PHRASES: IntroPhrase[] = [
  { kind: "text", text: "สวัสดีค่ะ", lang: "th", ms: 1700 },
  { kind: "text", text: "Hello.", lang: "en", ms: 1700 },
  { kind: "text", text: "ฉันคือหมอ…", lang: "th", ms: 1500 },
  { kind: "morph", from: "เมย์", to: "May", lead: "I'm", ms: 3600 },
  { kind: "text", text: "May I help you?", lang: "en", ms: 2200 },
];
const DEFAULT_PHRASE_MS = 1700;
const INTRO_ENABLED = false;
const INTRO_TOTAL_MS = INTRO_ENABLED
  ? INTRO_PHRASES.reduce((sum, p) => sum + (p.ms ?? DEFAULT_PHRASE_MS), 0) + 500
  : 0;
const INTRO_DELAY_S = INTRO_TOTAL_MS / 1000;

export default function AIMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const seededPrompt =
    typeof (location.state as { prompt?: unknown } | null)?.prompt === "string"
      ? ((location.state as { prompt: string }).prompt)
      : "";
  const { isRecording, startSession, stopSession, segments } = useDictationContext();
  const [prompt, setPrompt] = useState(seededPrompt);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when arriving with a seeded prompt so the user can refine/submit.
  useEffect(() => {
    if (seededPrompt) inputRef.current?.focus();
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachAccept, setAttachAccept] = useState<string>("");

  const openFilePicker = (accept: string) => {
    setAttachAccept(accept);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    console.log(
      "[ai-mode] attach",
      Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type })),
    );
    e.target.value = "";
  };

  const [introIndex, setIntroIndex] = useState(0);
  const [introDone, setIntroDone] = useState(!INTRO_ENABLED);
  const [searchHover, setSearchHover] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchEmphasis = searchHover || searchFocus;

  useEffect(() => {
    if (!INTRO_ENABLED) return;
    if (introIndex >= INTRO_PHRASES.length) {
      const t = window.setTimeout(() => setIntroDone(true), 500);
      return () => window.clearTimeout(t);
    }
    const ms = INTRO_PHRASES[introIndex].ms ?? DEFAULT_PHRASE_MS;
    const t = window.setTimeout(() => setIntroIndex((i) => i + 1), ms);
    return () => window.clearTimeout(t);
  }, [introIndex]);

  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  const handleMic = () => {
    if (isRecording) void stopSession();
    else startSession("mic");
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    console.log("[ai-mode] submit", prompt);
  };

  const features: FeatureCard[] = [
    {
      title: "บันทึกประวัติผู้ป่วยอัตโนมัติ",
      bullets: [
        { icon: IconScan, label: "สแกนบัตรประจำตัวประชาชน" },
        { icon: IconStethoscope, label: "ซักประวัติผู้ป่วย" },
      ],
      onClick: () => navigate("/patient/new"),
    },
    {
      title: "สรุป SOAP จากบทสนทนา",
      bullets: [
        { icon: IconMicrophone, label: "บันทึกเสียงสนทนา" },
        { icon: IconClipboardText, label: "ร่าง SOAP อัตโนมัติ" },
      ],
      onClick: () => navigate("/soap"),
    },
    {
      title: "แนะนำรหัส ICD-10 อัตโนมัติ",
      bullets: [
        { icon: IconHash, label: "เสนอรหัสจากอาการ" },
        { icon: IconReportMedical, label: "ตรวจสอบความถูกต้อง" },
      ],
    },
    {
      title: "ผู้ช่วยค้นคว้าทางคลินิก",
      bullets: [
        { icon: IconFileText, label: "ค้นคู่มือเวชปฏิบัติ" },
        { icon: IconClipboardText, label: "สรุปงานวิจัยให้สั้น" },
      ],
    },
  ];

  return (
    <motion.div
      // Immersive wrap-screen entry — iris reveal from center.
      initial={{ scale: 1.015 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        willChange: "opacity, transform",
        backfaceVisibility: "hidden",
      }}
      className="relative flex h-screen w-full flex-col overflow-hidden pt-[60px]"
    >
      {/* Background — pink → lavender → blue wash matching Figma. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #fdf2f6 0%, #f5eefe 40%, #e9eafd 75%, #c9d4ff 100%)",
        }}
      />

      {/* Inward vignette — darkens edges then clears, gives a "lens" feel and
          depth cue toward the center where the AI materializes. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0] }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], times: [0, 0.25, 1] }}
        className="pointer-events-none absolute inset-0 z-40"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, transparent 25%, rgba(60,40,140,0.45) 95%)",
          willChange: "opacity",
        }}
      />

      {/* Bright core flash — quick white pop that signals impact, then a slow
          violet halo bloom that takes over and fades elegantly. */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.05, opacity: 0 }}
        animate={{ scale: 1.4, opacity: [0, 1, 0.85, 0] }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], times: [0, 0.18, 0.4, 1] }}
        className="pointer-events-none absolute left-1/2 top-[40%] z-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "320px",
          height: "320px",
          borderRadius: "9999px",
          willChange: "transform, opacity",
          background:
            "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 25%, rgba(255,255,255,0) 60%)",
          filter: "blur(6px)",
        }}
      />

      {/* Violet halo bloom — slower, larger, layered behind the core flash. */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 3.2, opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], times: [0, 0.28, 1] }}
        className="pointer-events-none absolute left-1/2 top-[40%] z-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "600px",
          height: "600px",
          borderRadius: "9999px",
          willChange: "transform, opacity",
          background:
            "radial-gradient(circle, rgba(196,170,255,0.9) 0%, rgba(160,125,255,0.5) 30%, rgba(120,90,220,0.15) 55%, rgba(120,90,220,0) 80%)",
        }}
      />

      {/* Three concentric rings, staggered — sonar-pulse cadence. */}
      {[
        { delay: 0.1, size: 220, scale: 3.0, opacity: 0.7 },
        { delay: 0.32, size: 220, scale: 3.4, opacity: 0.55 },
        { delay: 0.55, size: 220, scale: 3.8, opacity: 0.4 },
      ].map((r, i) => (
        <motion.div
          key={i}
          aria-hidden
          initial={{ scale: 0.15, opacity: 0 }}
          animate={{ scale: r.scale, opacity: [0, r.opacity, 0] }}
          transition={{
            duration: 1.6,
            delay: r.delay,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.22, 1],
          }}
          className="pointer-events-none absolute left-1/2 top-[40%] z-50 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${r.size}px`,
            height: `${r.size}px`,
            borderRadius: "9999px",
            border: "1.5px solid rgba(180,150,255,0.7)",
            boxShadow:
              "0 0 60px rgba(160,125,255,0.45), inset 0 0 24px rgba(196,170,255,0.4)",
            willChange: "transform, opacity",
          }}
        />
      ))}

      {/* Sparkle particles — 10 small dots burst outward then fade. Adds the
          "AI shimmer" feel without being noisy. */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2 + (i % 2 === 0 ? 0 : Math.PI / 10);
        const distance = 180 + (i % 3) * 30;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const delay = 0.25 + (i % 5) * 0.04;
        return (
          <motion.div
            key={`spark-${i}`}
            aria-hidden
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{
              duration: 1.3,
              delay,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.3, 1],
            }}
            className="pointer-events-none absolute left-1/2 top-[40%] z-50 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(220,200,255,0.9) 50%, rgba(160,125,255,0) 100%)",
              boxShadow: "0 0 14px rgba(200,170,255,0.9)",
              willChange: "transform, opacity",
            }}
          />
        );
      })}

      {/* Apple-keynote-style intro overlay — cycles through phrases that
          introduce หมอเมย์, each fading in with a soft blur clear and tiny
          upward drift. Sits above all background effects but dismisses
          before the main content cascade begins. */}
      <AnimatePresence>
        {!introDone && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {introIndex < INTRO_PHRASES.length &&
                (INTRO_PHRASES[introIndex].kind === "morph" ? (
                  <IntroMorph
                    key={`morph-${introIndex}`}
                    phrase={INTRO_PHRASES[introIndex] as Extract<IntroPhrase, { kind: "morph" }>}
                  />
                ) : (
                  <motion.h2
                    key={introIndex}
                    initial={{ opacity: 0, y: 16, filter: "blur(12px)", letterSpacing: "0.12em" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0em" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center font-light text-neutral-900"
                    style={{
                      fontSize:
                        (INTRO_PHRASES[introIndex] as Extract<IntroPhrase, { kind: "text" }>).lang === "en"
                          ? "84px"
                          : "76px",
                      fontWeight: 300,
                      fontFamily:
                        (INTRO_PHRASES[introIndex] as Extract<IntroPhrase, { kind: "text" }>).lang === "en"
                          ? '"Inter", "Helvetica Neue", system-ui, sans-serif'
                          : '"Sarabun", sans-serif',
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                      textShadow: "0 2px 24px rgba(120,90,220,0.18)",
                    }}
                  >
                    {(INTRO_PHRASES[introIndex] as Extract<IntroPhrase, { kind: "text" }>).text}
                  </motion.h2>
                ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col px-6 pb-0">
        {/* Outer translucent white panel — holds greeting row + 2x2 grid */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: INTRO_DELAY_S + 0.1, ease: EASE_TV }}
          className="relative flex min-h-0 flex-1 flex-col rounded-t-[40px] border border-white/60 border-b-0 bg-white/80 px-8 pt-8 shadow-[0_24px_60px_rgba(80,60,160,0.10),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm"
        >
          {/* Mascot — absolute, top-left of the panel. Sized large and pulled
              upward so the head sits above the panel's top edge, and the body
              extends downward to overlap the first feature card below. */}
          <motion.img
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: INTRO_DELAY_S + 0.3, ease: [0.34, 1.4, 0.5, 1] }}
            src={AI_DOCTOR}
            alt="เมย์"
            decoding="async"
            className="pointer-events-none absolute -left-6 top-2 z-0 h-[200px] w-auto -scale-x-100 object-contain drop-shadow-[0_12px_24px_rgba(120,90,220,0.28)]"
          />

          {/* Top row — greeting (left) + search bar (right) */}
          <header className="relative z-10 flex items-center justify-between gap-8 pl-[170px]">
            <div className="relative flex items-center gap-4">
              <div className="flex flex-col">
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: INTRO_DELAY_S + 0.4, ease: EASE_TV }}
                  className="text-[13px] text-neutral-500"
                >
                  สวัสดีคุณ, นพ. ชารีฟ ราอูล
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: INTRO_DELAY_S + 0.48, ease: EASE_TV }}
                  className="mt-1 text-[18px] font-normal leading-tight text-neutral-900"
                >
                  มีอะไรต้องการ ?
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: INTRO_DELAY_S + 0.56, ease: EASE_TV }}
                  className="text-[24px] font-medium leading-tight tracking-tight text-neutral-900"
                >
                  บอก
                  <span
                    className="bg-clip-text font-bold text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, #ff8789 0%, #ff8789 50%, #3485ff 75%, #aa7edf 100%)",
                    }}
                  >
                    หมอเมย์
                  </span>
                  ได้เลย
                </motion.p>
              </div>
            </div>

            {/* Search / prompt bar — wrapped in BorderGlow (ported from
                reactbits.dev/components/border-glow). The looping sweep
                paints a rotating cone of light along the pill's border. */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: INTRO_DELAY_S + 0.6, ease: EASE_TV }}
              className="relative w-full max-w-[520px]"
            >
              {/* Static all-around halo + colored ring — fades in on hover/
                  focus to give a continuous "selected" glow that the rotating
                  cone-of-light layers on top of. Sits BEHIND the BorderGlow
                  pill via a negative inset and lower z. */}
              <motion.div
                aria-hidden
                initial={false}
                animate={{
                  opacity: searchEmphasis ? 1 : 0,
                  scale: searchEmphasis ? 1 : 0.985,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "inset 0 0 0 1.5px rgba(170,126,223,0.9), 0 0 18px 2px rgba(170,126,223,0.5), 0 0 48px 10px rgba(157,182,251,0.5), 0 0 90px 18px rgba(255,135,137,0.28)",
                }}
              />
              <BorderGlow
                animated
                loop
                backgroundColor="#ffffff"
                borderRadius={9999}
                glowRadius={searchEmphasis ? 56 : 28}
                glowColor={searchEmphasis ? "275 95 65" : "265 85 70"}
                glowIntensity={searchEmphasis ? 1.8 : 1}
                coneSpread={searchEmphasis ? 38 : 20}
                fillOpacity={searchEmphasis ? 0.7 : 0.35}
                loopDurationSec={searchEmphasis ? 3 : 6}
                colors={["#aa7edf", "#ff8789", "#3485ff"]}
              >
              <div
                onMouseEnter={() => setSearchHover(true)}
                onMouseLeave={() => setSearchHover(false)}
                onFocusCapture={() => setSearchFocus(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setSearchFocus(false);
                  }
                }}
                className={`relative flex items-center gap-3 px-4 py-2.5 transition ${
                  isRecording ? "ring-2 ring-violet-300" : ""
                }`}
                style={{ borderRadius: 9999 }}
              >
              <Dropdown placement="bottom-start" offset={12}>
                <DropdownTrigger>
                  <button
                    type="button"
                    aria-label="แนบไฟล์"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
                  >
                    <IconPlus className="h-5 w-5" stroke={1.75} />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="แนบไฟล์"
                  variant="flat"
                  className="min-w-[260px]"
                  onAction={(key) => {
                    switch (key) {
                      case "file":
                        openFilePicker(".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls");
                        break;
                      case "image":
                        openFilePicker("image/*");
                        break;
                      case "camera":
                        openFilePicker("image/*;capture=camera");
                        break;
                      case "idcard":
                        openFilePicker("image/*");
                        break;
                    }
                  }}
                >
                  <DropdownSection title="แนบเอกสาร" showDivider>
                    <DropdownItem
                      key="file"
                      description="PDF, Word, Excel, ข้อความ"
                      startContent={
                        <IconFileUpload className="h-5 w-5 text-violet-500" stroke={1.75} />
                      }
                    >
                      อัปโหลดไฟล์
                    </DropdownItem>
                    <DropdownItem
                      key="image"
                      description="JPG, PNG, HEIC"
                      startContent={
                        <IconPhoto className="h-5 w-5 text-emerald-500" stroke={1.75} />
                      }
                    >
                      อัปโหลดรูปภาพ
                    </DropdownItem>
                  </DropdownSection>
                  <DropdownSection title="สแกนสด">
                    <DropdownItem
                      key="camera"
                      description="ถ่ายภาพเอกสารหรือใบสั่งยา"
                      startContent={
                        <IconCamera className="h-5 w-5 text-amber-500" stroke={1.75} />
                      }
                    >
                      ถ่ายภาพจากกล้อง
                    </DropdownItem>
                    <DropdownItem
                      key="idcard"
                      description="ดึงข้อมูลผู้ป่วยอัตโนมัติ"
                      startContent={
                        <IconId className="h-5 w-5 text-rose-500" stroke={1.75} />
                      }
                    >
                      สแกนบัตรประชาชน
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
              <input
                ref={fileInputRef}
                type="file"
                accept={attachAccept}
                multiple
                className="hidden"
                onChange={handleFileChosen}
              />
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="ค้นหาประวัติผู้ป่วยชื่อสมชาย"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleMic}
                aria-label={isRecording ? "หยุดบันทึก" : "บันทึกเสียง"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                  isRecording
                    ? "bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4)]"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isRecording ? (
                    <motion.span
                      key="rec"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="block h-3 w-3 rounded-sm bg-white"
                    />
                  ) : (
                    <motion.span
                      key="mic"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                    >
                      <IconMicrophone className="h-5 w-5" stroke={1.75} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                aria-label="ค้นหา"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:bg-neutral-800"
              >
                <IconSearch className="h-5 w-5" stroke={2} />
              </button>
              </div>
              </BorderGlow>
            </motion.div>
          </header>

          {/* 2 × 2 feature card grid */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { delayChildren: INTRO_DELAY_S + 0.7, staggerChildren: 0.07 } },
            }}
            className="relative z-10 mt-6 grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-2"
          >
            {features.map((f, i) => (
              <FeatureTile key={i} {...f} />
            ))}
          </motion.div>
          <p className="relative z-10 mt-4 shrink-0 pb-4 text-center text-[11px] text-neutral-400">
            คำแนะนำของเมย์เป็นเพียงข้อมูลประกอบ — โปรดยืนยันด้วยวิจารณญาณทางคลินิก
          </p>
        </motion.section>

      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

function FeatureTile({ title, bullets, onClick }: FeatureCard) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.45, ease: EASE_TV }}
      className="group relative flex h-full min-h-0 cursor-pointer items-stretch gap-4 overflow-hidden rounded-[40px] border border-[#efefef] bg-white p-5 text-left shadow-[0_4px_4px_rgba(255,255,255,0.25)] transition hover:shadow-[0_14px_36px_rgba(80,60,160,0.14)]"
    >
      <div className="flex flex-1 flex-col">
        {/* Sparkles icon — Figma asset (doc + sparkle accent) */}
        <img src={AI_CARD_ICON} alt="" className="h-16 w-16" draggable={false} />
        <h3 className="mt-3 text-[18px] font-bold leading-tight text-[#1f1f1f]">
          {title}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          {bullets.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-[#777]">
              <Icon className="h-5 w-5 shrink-0 text-violet-500" stroke={1.75} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Isometric scan-strip decoration — Figma asset */}
      <div className="pointer-events-none absolute right-0 top-1/2 w-[230px] -translate-y-1/2">
        <img
          src={AI_CARD_SCAN}
          alt=""
          className="h-auto w-full object-contain"
          draggable={false}
        />
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// IntroMorph — the "เมย์ → May" story beat. Stacks both glyphs in the same
// position so the eye reads it as one name transforming between scripts:
//   1. Lead-in word ("I'm") slides in from the left
//   2. Thai "เมย์" appears in place
//   3. After a beat, "เมย์" blurs/scales out while "May" simultaneously
//      crystallizes in — same x/y, so visually it's a morph, not a swap.
function IntroMorph({
  phrase,
}: {
  phrase: Extract<IntroPhrase, { kind: "morph" }>;
}) {
  // Total dwell = phrase.ms. Split into three beats: appear (0–35%),
  // overlap morph (35–70%), settle (70–100%). Times are in seconds.
  const dwell = phrase.ms / 1000;
  const beatA = dwell * 0.35;
  const beatB = dwell * 0.35;

  return (
    <motion.div
      key={`morph-${phrase.from}-${phrase.to}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-baseline justify-center gap-4"
      style={{
        fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
        fontWeight: 300,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        textShadow: "0 2px 24px rgba(120,90,220,0.18)",
        color: "#1f1f1f",
      }}
    >
      {phrase.lead && (
        <motion.span
          initial={{ opacity: 0, x: -16, filter: "blur(8px)" }}
          animate={{ opacity: 0.85, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: "56px" }}
        >
          {phrase.lead}
        </motion.span>
      )}

      {/* Morph slot — both glyphs occupy the same position via a relative
          wrapper + absolutely-positioned exit glyph. The widths differ, so
          we let the entering glyph drive the layout width and overlay the
          exiting one on top during the crossfade window. */}
      <span className="relative inline-flex items-baseline">
        {/* Entering: English "May" */}
        <motion.span
          initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.9,
            delay: beatA + beatB * 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            fontSize: "100px",
            fontWeight: 500,
            background:
              "linear-gradient(90deg, #ff8789 0%, #ff8789 35%, #aa7edf 70%, #3485ff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          {phrase.to}
        </motion.span>

        {/* Exiting: Thai "เมย์" — overlaid in same baseline, fades out as
            "May" fades in. */}
        <motion.span
          initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.94, 1, 1.04, 1.08],
            filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(8px)"],
          }}
          transition={{
            duration: beatA + beatB,
            times: [0, 0.25, 0.6, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap"
          style={{
            fontFamily: '"Sarabun", sans-serif',
            fontSize: "92px",
            fontWeight: 500,
            background:
              "linear-gradient(90deg, #ff8789 0%, #aa7edf 60%, #3485ff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            pointerEvents: "none",
          }}
        >
          {phrase.from}
        </motion.span>
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

