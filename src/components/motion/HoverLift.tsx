"use client";

/**
 * Micro-scale + shadow lift on hover, driven by framer-motion so the
 * easing feels smoother than a raw CSS `transition-transform`. Meant
 * for cards and clickable tiles — anything that should reward
 * a mouse-over with a subtle visual response.
 *
 * Why not just Tailwind `hover:scale-[1.01]`?
 *   Tailwind's default `transition` uses a cubic bezier that feels
 *   slightly mechanical on scale transforms. Framer's spring physics
 *   feel natural. The visual difference is small — the FEEL difference
 *   is meaningful.
 *
 * Falls back to a passthrough div under reduced-motion.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Scale factor on hover. 1.01 = 1% larger. Default 1.015. */
  scale?: number;
}

export function HoverLift({ children, className, scale = 1.015 }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
