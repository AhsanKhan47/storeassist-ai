"use client";

// Small animation hooks: no animation library, just requestAnimationFrame.
// All of them switch off when the visitor asks for reduced motion.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Reveals streamed text at a smooth, steady pace instead of in network-sized jumps.
 * Speeds up when it falls behind, so it never lags the real answer by more than a moment.
 */
export function useSmoothText(target: string): { text: string; settled: boolean } {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    if (shownRef.current > target.length) shownRef.current = target.length;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(64, now - last);
      last = now;
      const remaining = target.length - shownRef.current;
      if (remaining <= 0) return;
      const charsPerSecond = Math.max(110, remaining * 3.2);
      shownRef.current = Math.min(
        target.length,
        shownRef.current + Math.max(1, Math.round((charsPerSecond * elapsed) / 1000)),
      );
      setShown(shownRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  if (reduced) return { text: target, settled: true };
  const count = Math.min(shown, target.length);
  return { text: target.slice(0, count), settled: count >= target.length };
}

/** Animates a number from its previous value to the new one (ease-out, 0.7 s). */
export function useCountUp(value: number): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (reduced) return;
    const from = fromRef.current;
    if (from === value) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      fromRef.current = t < 1 ? current : value;
      setDisplay(fromRef.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return Math.round(reduced ? value : display);
}
