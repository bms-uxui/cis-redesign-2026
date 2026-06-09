import { AnimatePresence, motion } from "framer-motion";
import { IconSparkles } from "@tabler/icons-react";
import { Tooltip } from "@heroui/react";
import { useAiva } from "../contexts/AivaContext";

/**
 * Floating AI chat button — always-visible affordance in the bottom-right
 * corner that opens the Mae chat modal. Hides while the chat is already
 * on screen so it doesn't double up.
 */
export default function MenuPaletteHint() {
  const { openAiva, open: aivaOpen } = useAiva();

  return (
    <AnimatePresence>
      {!aivaOpen && (
        <motion.div
          key="aiva-fab"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 right-4 z-[60]"
        >
          <Tooltip
            content={
              <span className="flex items-center gap-2">
                ถามเมย์
                <kbd className="inline-flex h-4 min-w-[20px] items-center justify-center rounded border border-white/20 px-1 font-mono text-[10px] font-semibold">
                  ⌘K
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
              onClick={() => openAiva()}
              aria-label="ถามเมย์"
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[var(--theme-primary)] text-white shadow-[var(--theme-shadow-md)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:shadow-[var(--theme-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-base)]"
            >
              <IconSparkles className="h-5 w-5" stroke={1.75} />
            </button>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
