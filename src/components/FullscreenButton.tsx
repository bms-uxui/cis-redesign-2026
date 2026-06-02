import { IconMaximize, IconMinimize } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import Tooltip from "./Tooltip";

interface FullscreenButtonProps {
  className?: string;
  iconClassName?: string;
}

export default function FullscreenButton({ className, iconClassName }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore — browser may block without user gesture or in iframe */
    }
  }, []);

  const Icon = isFullscreen ? IconMinimize : IconMaximize;

  return (
    <Tooltip label={isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}>
      <button
        type="button"
        onClick={toggle}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className={
          className ??
          "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/65 shadow-[0_4px_14px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl transition hover:bg-white/80"
        }
      >
        <Icon className={iconClassName ?? "h-5 w-5"} stroke={1.75} />
      </button>
    </Tooltip>
  );
}
