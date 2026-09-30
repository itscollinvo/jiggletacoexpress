"use client";

/**
 * Slide-in from a direction, plus fade. More expressive than FadeIn's
 * 8px rise — meant for hero sections and section headers where you want
 * the entrance to feel more deliberate.
 *
 * Use FadeIn (from R.1) for gentle appearance; use this for "this is a
 * new section, please look at it."
 */

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

type Direction = "left" | "right" | "up" | "down";

interface Props {
  children: ReactNode;
  className?: string;
  from?: Direction;
  /** How far away the element starts, in pixels. Default 40. */
  offset?: number;
  /** Delay in seconds. */
  delay?: number;
  /** Trigger on scroll-into-view (default true) vs mount immediately. */
  onScroll?: boolean;
}

function offsetToInitial(from: Direction, offset: number) {
  switch (from) {
    case "left":
      return { x: -offset, y: 0 };
    case "right":
      return { x: offset, y: 0 };
    case "up":
      return { x: 0, y: -offset };
    case "down":
      return { x: 0, y: offset };
  }
}

export function SlideIn({
  children,
  className,
  from = "up",
  offset = 40,
  delay = 0,
  onScroll = true,
}: Props) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const initial = { opacity: 0, ...offsetToInitial(from, offset) };
  const animate = { opacity: 1, x: 0, y: 0 };
  const transition = {
    duration: 0.6,
    delay,
    ease: [0.16, 1, 0.3, 1] as const,
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
