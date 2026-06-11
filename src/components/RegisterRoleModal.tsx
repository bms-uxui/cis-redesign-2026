import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTabs } from "../contexts/TabsContext";
import AI_BG from "../assets/figma/reg2-ai-photo.png"; // office background
import AI_FG from "../assets/figma/reg2-ai-object.png"; // people cut-out (transparent)
import AI_ICONIMG from "../assets/figma/reg2-ai-iconimg.png"; // notepad mascot
import MANUAL_PHOTO from "../assets/figma/reg2-manual-photo.png";
import MANUAL_ICONIMG from "../assets/figma/reg2-manual-iconimg.png"; // clipboard

/**
 * Register role picker (Figma 1137:2420) — opened from the
 * "ลงทะเบียนผู้ป่วยใหม่" button. Two cards: photo + overlapping icon + title
 * + bulleted description. Accent (hover ring) uses the design-system theme.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface RoleCard {
  key: string;
  bg: string;
  fg?: string; // optional transparent foreground layered over bg
  iconImg: string;
  title: string;
  points: string[];
  path: string;
  forceNew?: boolean;
}

const CARDS: RoleCard[] = [
  {
    key: "ai",
    bg: AI_BG,
    fg: AI_FG,
    iconImg: AI_ICONIMG,
    title: "ลงทะเบียนด้วย AI",
    points: [
      "บันทึกประวัติผู้ป่วยโดยไม่ต้องจด",
      "ข้อมูลแม่นยำขึ้น ลดความซ้ำซ้อน",
      "สะดวกรวดเร็วในการให้บริการ",
    ],
    path: "/patient/new",
  },
  {
    key: "manual",
    bg: MANUAL_PHOTO,
    iconImg: MANUAL_ICONIMG,
    title: "ลงทะเบียนทั่วไป",
    points: [
      "ลงทะเบียนผู้ป่วยด้วยตนเอง",
      "ค้นหาข้อมูลง่ายสะดวก",
      "ข้อมูลถูกต้องตรงตามเจ้าของ",
    ],
    path: "/opd",
    forceNew: true,
  },
];

export default function RegisterRoleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { openTab } = useTabs();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const choose = (card: RoleCard) => {
    openTab(card.path, { title: card.title, forceNew: card.forceNew });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="เลือกวิธีลงทะเบียนผู้ป่วยใหม่"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-5 sm:flex-row sm:gap-[100px]"
          >
            {CARDS.map((card) => (
              <RoleCardView
                key={card.key}
                card={card}
                onClick={() => choose(card)}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RoleCardView({
  card,
  onClick,
}: {
  card: RoleCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={card.title}
      className="group relative flex w-[250px] flex-col overflow-hidden rounded-[20px] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] text-center outline-none ring-2 ring-transparent transition duration-200 hover:-translate-y-1 hover:ring-[var(--theme-primary)] hover:shadow-[var(--theme-shadow-md)] focus-visible:ring-[var(--theme-primary)]"
    >
      {/* Photo (office bg + optional people foreground) */}
      <div className="relative h-[200px] w-full overflow-hidden bg-[var(--theme-base)]">
        <img
          src={card.bg}
          alt=""
          className="absolute inset-0 h-full w-full scale-[1.1] object-cover transition-transform duration-300 group-hover:scale-[1.14]"
        />
        {card.fg && (
          <img
            src={card.fg}
            alt=""
            className="absolute bottom-0 left-1/2 w-[96%] -translate-x-1/2 object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
      </div>

      {/* Overlapping icon — CSS circle + mascot */}
      <div className="relative z-10 -mt-10 mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[3px] border-[var(--theme-surface)] bg-[#cfe4ff] shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
        <img
          src={card.iconImg}
          alt=""
          className="h-[115%] w-[115%] object-contain"
        />
      </div>

      {/* Title + description */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-2">
        <h3 className="text-[length:var(--theme-text-lg)] font-bold text-[var(--theme-neutral)]">
          {card.title}
        </h3>
        <ul className="mt-3 flex flex-col gap-1.5 text-left">
          {card.points.map((p, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[length:var(--theme-text-sm)] leading-snug text-[var(--theme-neutral)]/60"
            >
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--theme-primary)]" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}
