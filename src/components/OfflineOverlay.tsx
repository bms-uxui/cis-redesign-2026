import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconWifiOff, IconLoader2, IconRefresh } from "@tabler/icons-react";

/** Probe real reachability instead of trusting `navigator.onLine`, which
 *  false-positives in webviews / on flaky wifi. Fetches a tiny same-origin URL
 *  (no-store) with a short timeout; resolves true only if it actually loads. */
async function probeOnline(timeoutMs = 4000): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    // browser is certain it's offline — trust the negative, skip the request
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    // same-origin request — can't be blocked by CORS and needs no network round
    // trip to a third party. cache-busting query avoids a cached 200.
    await fetch(`${import.meta.env.BASE_URL}favicon.ico?_=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return true; // any HTTP response (even 404) means the server is reachable
  } catch {
    return false;
  }
}

/** App-wide connection guard. Blocks the UI with a "ไม่มีการเชื่อมต่ออินเทอร์เน็ต"
 *  screen only on a CONFIRMED, sustained loss — a real fetch probe must fail
 *  twice in a row before the overlay shows, so brief `offline`-event blips
 *  (common in webviews) don't flash it. Keeps probing to clear itself the
 *  moment the connection is genuinely back. */
export default function OfflineOverlay() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let misses = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ms: number) => {
      timer = setTimeout(tick, ms);
    };

    async function tick() {
      const ok = await probeOnline();
      if (cancelled) return;
      if (ok) {
        misses = 0;
        setOnline(true);
        schedule(15000); // healthy → check back occasionally
      } else {
        misses += 1;
        // require two consecutive failures before declaring offline (debounce)
        if (misses >= 2) setOnline(false);
        schedule(misses >= 2 ? 4000 : 1500); // recheck faster while suspect/offline
      }
    }

    // Browser hints just trigger an immediate re-probe (we don't trust them blindly)
    const onHint = () => {
      if (timer) clearTimeout(timer);
      schedule(0);
    };
    window.addEventListener("online", onHint);
    window.addEventListener("offline", onHint);

    schedule(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", onHint);
      window.removeEventListener("offline", onHint);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b1220]/55 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-[24px] bg-white p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          >
            <span className="relative grid h-16 w-16 place-items-center rounded-full bg-[#ff383c]/10 text-[#ff383c]">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#ff383c]/15" />
              <IconWifiOff className="relative h-8 w-8" stroke={2} />
            </span>
            <div className="space-y-1">
              <h2 className="text-[18px] font-bold text-[#22202a]">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h2>
              <p className="text-[13px] leading-relaxed text-black/55">
                การเชื่อมต่อหลุด — ระบบจะกลับมาทำงานเองทันทีที่เน็ตกลับมา
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-black/45">
              <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
              กำลังพยายามเชื่อมต่อใหม่…
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-1 flex items-center gap-2 rounded-full bg-[#3965e1] px-5 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 active:scale-95"
            >
              <IconRefresh className="h-4 w-4" stroke={2.2} />
              โหลดใหม่
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
