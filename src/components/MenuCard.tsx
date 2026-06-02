import { motion } from "framer-motion";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface MenuCardProps {
  label: string;
  img: string;
  onClick?: () => void;
}

export default function MenuCard({ label, img, onClick }: MenuCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="group relative block aspect-square w-full text-left"
      initial="rest"
      animate="rest"
      transition={{ duration: 0.45, ease: EASE_TV }}
    >
      {/* Colored glow halo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[30px] opacity-0 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(52,133,255,0.55), rgba(106,76,255,0.45))",
        }}
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.5, ease: EASE_TV }}
      />

      {/* Card body */}
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.25)] ring-1 ring-white/0"
        variants={{
          rest: { scale: 1, y: 0, boxShadow: "0 4px 24px rgba(0,0,0,0.25)" },
          hover: {
            scale: 1.06,
            y: -4,
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.65) inset",
          },
        }}
        transition={{ duration: 0.5, ease: EASE_TV }}
      >
        <motion.img
          src={img}
          alt={label}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          variants={{
            rest: { scale: 1, filter: "brightness(0.95) saturate(1)" },
            hover: { scale: 1.12, filter: "brightness(1.08) saturate(1.15)" },
          }}
          transition={{ duration: 0.7, ease: EASE_TV }}
        />
        <motion.div
          className="absolute inset-0"
          variants={{
            rest: {
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
            },
            hover: {
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)",
            },
          }}
          transition={{ duration: 0.5, ease: EASE_TV }}
        />
        <motion.div
          className="absolute inset-x-0 bottom-0 p-6"
          variants={{
            rest: { y: 0 },
            hover: { y: -4 },
          }}
          transition={{ duration: 0.45, ease: EASE_TV }}
        >
          <p className="text-2xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
            {label}
          </p>
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
