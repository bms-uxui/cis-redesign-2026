import { useEffect, useRef, useState } from "react";

export interface UseTypewriterOptions {
  // Base reveal rate in graphemes per second when caught up.
  baseRate?: number;
  // Hard cap on reveal rate when the buffer balloons.
  maxRate?: number;
  // How aggressively to accelerate when behind. Higher = faster catch-up.
  catchUpGain?: number;
  // Grapheme segmenter (defaults to Intl.Segmenter / Array.from fallback).
  segmenter?: (text: string) => string[];
}

const defaultSegment = (text: string): string[] => {
  if (!text) return [];
  const SegCtor = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (SegCtor) {
    try {
      const seg = new SegCtor(undefined, { granularity: "grapheme" });
      const out: string[] = [];
      for (const s of seg.segment(text)) out.push(s.segment);
      return out;
    } catch {
      /* fall through */
    }
  }
  return Array.from(text);
};

/**
 * Reveals `target` one grapheme at a time at a smoothed rate so that bursty
 * ASR chunk arrivals feel like a continuous live caption stream.
 *
 * Strategy:
 *  - Buffer the full target as graphemes.
 *  - Advance a `revealed` counter on each animation frame.
 *  - Rate = baseRate + catchUpGain * (buffered - revealed), clamped to maxRate.
 *    The more we're behind, the faster we drip — but never instant, so
 *    perceived latency from the user's mouth to the screen stays steady
 *    instead of arriving in chunks.
 */
export function useTypewriter(target: string, opts: UseTypewriterOptions = {}): string {
  const baseRate = opts.baseRate ?? 18; // ~ natural reading speed
  const maxRate = opts.maxRate ?? 90;
  const catchUpGain = opts.catchUpGain ?? 1.4;
  const segmenter = opts.segmenter ?? defaultSegment;

  const [, force] = useState(0);
  const targetSegsRef = useRef<string[]>([]);
  const revealedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Re-segment on target change. Reuse stable prefix to avoid jitter.
  useEffect(() => {
    const next = segmenter(target);
    const prev = targetSegsRef.current;
    let common = 0;
    const min = Math.min(prev.length, next.length);
    while (common < min && prev[common] === next[common]) common++;
    targetSegsRef.current = next;
    // If target shrank or diverged before what we've shown, clamp reveal.
    if (revealedRef.current > common) {
      revealedRef.current = Math.min(common, next.length);
    }
    if (revealedRef.current > next.length) revealedRef.current = next.length;
    tick();
  }, [target, segmenter]);

  // animation loop
  function tick() {
    if (rafRef.current != null) return;
    lastTickRef.current = null;
    const step = (now: number) => {
      const last = lastTickRef.current ?? now;
      const dt = Math.min(0.25, (now - last) / 1000); // clamp to avoid huge jumps
      lastTickRef.current = now;
      const segs = targetSegsRef.current;
      const behind = segs.length - revealedRef.current;
      if (behind <= 0) {
        rafRef.current = null;
        return;
      }
      const rate = Math.min(maxRate, baseRate + catchUpGain * behind);
      const advance = rate * dt;
      const next = Math.min(segs.length, revealedRef.current + advance);
      const before = Math.floor(revealedRef.current);
      revealedRef.current = next;
      const after = Math.floor(next);
      if (after !== before) force((n) => n + 1);
      if (revealedRef.current < segs.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const segs = targetSegsRef.current;
  const shown = Math.floor(revealedRef.current);
  return segs.slice(0, shown).join("");
}
