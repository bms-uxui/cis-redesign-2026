import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { useTabs } from "../contexts/TabsContext";
import AI_CARD from "../assets/figma/role-ai-card.png";
import MANUAL_CARD from "../assets/figma/role-manual-card.png";

/**
 * Register role picker (Figma 1115:2059) — opened from the
 * "ลงทะเบียนผู้ป่วยใหม่" button. Two photo cards: register with AI vs the
 * general/manual flow. Accent (hover ring) uses the design-system theme.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

  const choose = (path: string, title: string, forceNew = false) => {
    openTab(path, { title, forceNew });
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
            className="relative rounded-[24px] bg-[var(--theme-surface)] p-8 shadow-[var(--theme-shadow-md)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-neutral)]/50 transition hover:bg-[var(--theme-base)] hover:text-[var(--theme-neutral)]"
            >
              <IconX className="h-4 w-4" stroke={2} />
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
              <RoleCard
                img={AI_CARD}
                label="ลงทะเบียนด้วย AI"
                onClick={() => choose("/patient/new", "ลงทะเบียนด้วย AI")}
              />
              <RoleCard
                img={MANUAL_CARD}
                label="ลงทะเบียนทั่วไป"
                onClick={() => choose("/opd", "ลงทะเบียนทั่วไป", true)}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RoleCard({
  img,
  label,
  onClick,
}: {
  img: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative h-[275px] w-[300px] overflow-hidden rounded-[16px] outline-none ring-2 ring-transparent transition duration-200 hover:-translate-y-1 hover:ring-[var(--theme-primary)] focus-visible:ring-[var(--theme-primary)]"
    >
      <img
        src={img}
        alt={label}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
      {/* Hover tint in the theme accent */}
      <span className="pointer-events-none absolute inset-0 bg-[var(--theme-primary)]/0 transition group-hover:bg-[var(--theme-primary)]/10" />
    </button>
  );
}
