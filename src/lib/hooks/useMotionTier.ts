"use client";

/**
 * How much motion this visitor's device should get.
 *
 *   "off"  — the OS asks for reduced motion. No 3D, no smooth scroll.
 *            Static fallbacks only.
 *   "lite" — a phone/tablet (coarse pointer) or a narrow screen. 3D still
 *            renders, but scenes should drop detail and skip cursor effects.
 *   "full" — a desktop with a mouse. Everything on.
 *
 * Why a hook and not CSS media queries? CSS can hide things, but it can't
 * stop JavaScript from *downloading* three.js. We read the same media
 * queries in JS so we can skip loading the 3D bundle entirely when the
 * answer is "off".
 *
 * `null` means "not known yet": on the server (and for the first client
 * render) there is no `window`, so we can't ask. Callers should render
 * their static fallback while the tier is null. That keeps the server HTML
 * and the first client render identical, which avoids hydration mismatches.
 */

import { useEffect, useState } from "react";

export type MotionTier = "off" | "lite" | "full";

const REDUCED = "(prefers-reduced-motion: reduce)";
const COARSE = "(pointer: coarse)";
const NARROW = "(max-width: 767px)";

function readTier(): MotionTier {
  if (window.matchMedia(REDUCED).matches) return "off";
  if (window.matchMedia(COARSE).matches || window.matchMedia(NARROW).matches) {
    return "lite";
  }
  return "full";
}

export function useMotionTier(): MotionTier | null {
  const [tier, setTier] = useState<MotionTier | null>(null);

  useEffect(() => {
    const update = () => setTier(readTier());
    update();

    // Re-check when any of the inputs change: the user flips the OS
    // reduced-motion switch, rotates a tablet, or resizes the window
    // across the 768px breakpoint.
    const queries = [REDUCED, COARSE, NARROW].map((q) => window.matchMedia(q));
    queries.forEach((mq) => mq.addEventListener("change", update));
    return () =>
      queries.forEach((mq) => mq.removeEventListener("change", update));
  }, []);

  return tier;
}
