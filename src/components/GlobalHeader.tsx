import { motion } from "framer-motion";
import { IconBellRinging, IconUserCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router";
import EHP_LOGO from "../assets/figma/ehp-logo.png";
import FullscreenButton from "./FullscreenButton";
import Tooltip from "./Tooltip";
import { useHeaderSlot } from "../contexts/HeaderSlotContext";

interface GlobalHeaderProps {
  onOpenAiva?: () => void;
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Persistent top-of-app strip that lives at AppShell level so it doesn't
 * unmount on navigation. Holds the logo (left) and the universal action
 * cluster (right): fullscreen, notifications, profile.
 *
 * Page-specific bits (greetings, page tabs, save buttons) stay inside each
 * route's main content.
 */
export default function GlobalHeader({ onOpenAiva }: GlobalHeaderProps = {}) {
  const navigate = useNavigate();
  const { leftContent } = useHeaderSlot();
  return (
    <motion.header
      className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[64px] pt-2"
      initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.15, ease: EASE_TV }}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
        <div className="pointer-events-auto flex items-center gap-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="shrink-0"
            aria-label="หน้าแรก"
          >
            <img
              src={EHP_LOGO}
              alt="Excellent Health Platform"
              className="h-10 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
          </button>
          {leftContent}
        </div>
        <div className="pointer-events-auto flex items-center gap-2.5">
          {onOpenAiva && (
            <Tooltip label="ถามเมย์ (Cmd K)">
              <button
                type="button"
                onClick={onOpenAiva}
                className="group flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5"
                aria-label="ถามเมย์"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 transition-transform duration-300 group-hover:scale-110">
                  <defs>
                    <linearGradient id="mae-spark" x1="20" y1="4" x2="5" y2="20" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#c084fc" />
                      <stop offset="0.5" stopColor="#a855f7" />
                      <stop offset="1" stopColor="#4f7cf6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2c.5 5.5 4 9 9.5 9.5C16 12 12.5 15.5 12 21c-.5-5.5-4-9-9.5-9.5C8 11 11.5 7.5 12 2Z"
                    fill="url(#mae-spark)"
                  />
                </svg>
              </button>
            </Tooltip>
          )}
          <FullscreenButton />
          <Tooltip label="แจ้งเตือน">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/65 shadow-[0_4px_14px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            >
              <IconBellRinging className="h-5 w-5" stroke={1.75} />
            </button>
          </Tooltip>
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-full border border-white/40 bg-white/65 px-3 shadow-[0_4px_14px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl"
          >
            <IconUserCircle className="h-5 w-5" stroke={1.75} />
            <span className="text-sm font-medium text-gray-900">นพ. ชารีฟ ราอูล</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
