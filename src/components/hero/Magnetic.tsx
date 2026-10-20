"use client";

/**
 * Magnetic hover: the element leans toward the cursor while it's over it,
 * then springs back when it leaves.
 *
 * useMotionValue holds the raw offset (no React re-render per mouse move),
 * and useSpring chases it with physics, which is what gives the soft,
 * slightly elastic follow instead of a stiff 1:1 drag.
 *
 * Touch devices and reduced motion: no pull (the global MotionConfig drops
 * transform animations, and we ignore non-mouse pointers).
 */

import { motion, useMotionValue, useSpring } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";

export function Magnetic({
  children,
  strength = 0.3,
}: {
  children: ReactNode;
  /** Fraction of the cursor's distance from center to follow. */
  strength?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 250, damping: 18, mass: 0.4 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  function onPointerMove(e: PointerEvent<HTMLSpanElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      className="inline-block"
      style={{ x: sx, y: sy }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}
