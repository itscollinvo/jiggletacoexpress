"use client";

/**
 * Fade + rise on mount. The workhorse of the motion layer — wrap any
 * section that should feel like it appears rather than snaps in.
 *
 * Accessibility:
 *   Respects prefers-reduced-motion. When the user has motion disabled
 *   in their OS, we render the children with no animation at all — same
 *   final visual, no distraction.
 *
 * Perf:
 *   The `once: true` on whileInView means the animation only fires the
 *   first time the element scrolls into view. If you keep scrolling and
 *   come back, no re-animation. Prevents jarring re-triggers.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Delay in seconds. Useful for cascading multiple FadeIns manually. */
  delay?: number;
  /** How far below its final position the element starts, in pixels. */
  offset?: number;
  /** Optional className passthrough. */
  className?: string;
  /** Trigger on scroll-into-view (default true) vs mount immediately. */
  onScroll?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  offset = 8,
  className,
  onScroll = true,
}: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const initial = { opacity: 0, y: offset };
  const animate = { opacity: 1, y: 0 };
  const transition = {
    duration: 0.5,
    delay,
    ease: [0.16, 1, 0.3, 1] as const, // "expo-out" — snappy start, gentle finish
  };

  if (onScroll) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={animate}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
