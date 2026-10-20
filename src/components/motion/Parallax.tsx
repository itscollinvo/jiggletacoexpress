"use client";

/**
 * Scroll-linked parallax. As the page scrolls, wrapped content translates
 * vertically at a different rate than the scroll itself. Positive
 * `strength` moves content DOWN slower than scroll (looks like it "falls
 * behind"); negative pushes it up faster.
 *
 * Kept modest by default — max 40px displacement. Full-page parallax
 * gets nausea-inducing fast; we want depth, not disorientation.
 *
 * Uses useScroll + useTransform which is the framer-motion idiom for
 * scroll-linked animation. `target: ref` scopes progress to when THIS
 * element moves through the viewport, not the whole document.
 */

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Pixels of displacement at the extreme of the scroll range. */
  strength?: number;
}

export function Parallax({ children, className, strength = 40 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Track scroll progress from when the element enters the viewport
  // (offset "start end") to when it fully leaves (offset "end start").
  // Range is 0 → 1 over that span.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // `amount` is 1 normally and 0 for reduced motion. It's a motion value
  // (not a render branch) on purpose: the server can't know the OS setting,
  // so the first render must be identical either way, and flipping a motion
  // value after mount changes the style without re-rendering.
  const amount = useMotionValue(1);
  useEffect(() => {
    amount.set(reduced ? 0 : 1);
  }, [reduced, amount]);

  // Map 0..1 → -strength..+strength. Element sits at neutral when centered.
  const y = useTransform(
    [scrollYProgress, amount],
    ([p, k]: number[]) => (p * 2 - 1) * strength * k,
  );

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
