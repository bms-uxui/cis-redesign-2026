import { AnimatePresence, motion } from "framer-motion";
import { IconSearch } from "@tabler/icons-react";
import { Tooltip } from "@heroui/react";
import { useSidebar } from "../contexts/SidebarContext";
import { useAiva } from "../contexts/AivaContext";

/**
 * Floating search button — always-visible affordance in the bottom-right
 * corner that opens the global menu palette. Hides itself while the
 * palette is already on screen so it doesn't double up.
 */
export default function MenuPaletteHint() {
  const { openPalette, paletteOpen } = useSidebar();
  const { open: aivaOpen } = useAiva();

  return (
    <AnimatePresence>
      {!paletteOpen && (
        <motion.div
          key="palette-fab"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 z-[60] transition-[right] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ right: aivaOpen ? 360 + 16 : 16 }}
        >
          <Tooltip
            content={
              <span className="flex items-center gap-2">
                ค้นหาเมนู
                <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-white/20 px-1 font-mono text-[10px] font-semibold">
                  /
                </kbd>
              </span>
            }
            placement="left"
            delay={200}
            closeDelay={0}
            offset={10}
            classNames={{
              content:
                "bg-[var(--theme-neutral)] text-white text-[length:var(--theme-text-xs)] font-medium px-2.5 py-1.5 rounded-lg shadow-[var(--theme-shadow-md)]",
            }}
          >
            <button
              type="button"
              onClick={openPalette}
              aria-label="ค้นหาเมนู"
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[var(--theme-primary)] text-white shadow-[var(--theme-shadow-md)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:shadow-[var(--theme-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-base)]"
            >
              <IconSearch className="h-5 w-5" stroke={1.75} />
            </button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
