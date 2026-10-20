"use client";

/**
 * Route-change transition. When you navigate between /projects → /about,
 * the incoming page fades in over ~250ms instead of snapping in. Keyed
 * on pathname so React remounts the wrapper each navigation, which is
 * what triggers the fresh animation.
 *
 * Perf note:
 *   AnimatePresence with mode="wait" was tempting (fade out old → fade
 *   in new) but on the Next.js App Router that doubles perceived
 *   navigation time. We do a straight fade-in of the new page instead;
 *   the previous page disappears instantly, and the incoming one rises
 *   into place. Cleaner on modern hardware.
 *
 * Accessibility:
 *   prefers-reduced-motion is handled by <MotionConfig reducedMotion="user">:
 *   framer-motion skips the movement (the y offset) and keeps only the
 *   opacity fade, which doesn't cause motion sickness.
 *
 *   It used to return a bare fragment when reduced motion was on. That broke
 *   hydration: on the server useReducedMotion() can't know the setting, so
 *   the server rendered the <div> and the browser rendered a fragment, and
 *   React threw away and rebuilt the page. Rendering the same element either
 *   way keeps server and client HTML identical.
 */

import { MotionConfig, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
    >
      {children}
    </motion.div>
    </MotionConfig>
  );
}
