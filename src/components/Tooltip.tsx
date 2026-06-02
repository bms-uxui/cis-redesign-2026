import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Where the tip drops relative to the trigger. Default "bottom". */
  side?: "top" | "bottom";
  /** Hover delay before showing, ms. Default 120. */
  delay?: number;
  className?: string;
}

/**
 * Wrap any focusable element to add a hover-delay tooltip.
 *
 * Splits positioning (CSS transform on the outer wrapper) from the entry/exit
 * animation (framer-motion on the inner pill) so the two systems don't fight
 * over `transform` — which is the classic reason tooltips appear off-center
 * or invisible when used naively with framer-motion.
 */
export default function Tooltip({
  label,
  children,
  side = "bottom",
  delay = 120,
  className,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);

  const handleEnter = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(true), delay);
  };
  const handleLeave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setShow(false);
  };

  return (
    <div
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <div
            className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 ${
              side === "top" ? "bottom-full mb-3" : "top-full mt-3"
            }`}
          >
            <motion.div
              role="tooltip"
              initial={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: side === "top" ? 2 : -2, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="whitespace-nowrap rounded-lg bg-black/85 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur"
            >
              {label}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
