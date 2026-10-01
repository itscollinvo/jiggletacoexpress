"use client";

/**
 * 3D tilt-on-hover, cursor-relative. As the mouse moves across the
 * wrapped element, it rotates a few degrees toward the cursor — like
 * a card being physically pressed. Snaps back to flat on mouse leave.
 *
 * Kept mild (max 5° per axis). Bigger angles feel like a novelty demo;
 * smaller feel invisible. Five degrees is the "modern portfolio site"
 * sweet spot.
 *
 * `transformPerspective` on the parent triggers 3D compositing. Without
 * it the rotateX/Y just squash the element rather than tilting it.
 */

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Max degrees of rotation per axis. Default 5. */
  maxTilt?: number;
}

export function TiltCard({ children, className, maxTilt = 5 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Raw mouse position (0..1) inside the element. useMotionValue avoids
  // React state updates for every frame — framer reads these directly.
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spring-smoothed rotation. Stiffness 150 / damping 20 = quick response
  // with a tiny overshoot on hover, natural settle on leave.
  const springConfig = { stiffness: 150, damping: 20 };
  const rotateY = useSpring(
    useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]),
    springConfig,
  );
  const rotateX = useSpring(
    useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]),
    springConfig,
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}
