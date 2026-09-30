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
 *   prefers-reduced-motion collapses to a plain fragment. No animation,
 *   no wrapper div (fragment means zero DOM cost).
 */

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
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
  );
}
