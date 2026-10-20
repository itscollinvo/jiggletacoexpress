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
 *   prefers-reduced-motion is handled by <MotionConfig reducedMotion="user">
 *   in providers.tsx:
 *   framer-motion skips the movement (the y offset) and keeps only the
 *   opacity fade, which doesn't cause motion sickness.
 *
 *   It used to return a bare fragment when reduced motion was on. That broke
 *   hydration: on the server useReducedMotion() can't know the setting, so
 *   the server rendered the <div> and the browser rendered a fragment, and
 *   React threw away and rebuilt the page. Rendering the same element either
 *   way keeps server and client HTML identical.
 */

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Has the visitor navigated within the site yet?
 *
 * Only animate on client-side navigations, never on the first load. The
 * first page comes from the server as HTML; if it's wrapped in
 * `initial={{ opacity: 0 }}`, framer-motion writes `opacity:0` into that
 * HTML and the whole page stays invisible until React has downloaded and
 * hydrated (~3 s on a slow phone, which PageSpeed reported as a slow
 * Largest Contentful Paint). With `initial={false}` the server HTML is
 * visible immediately.
 *
 * A module-level flag works here because it only ever flips in the
 * browser (effects don't run on the server), and it survives route
 * changes since this module stays loaded.
 */
let hasMounted = false;

interface Props {
  children: ReactNode;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  // Read during render: false on the server and on the first client
  // render (so they match), true for every page after that.
  const animateIn = hasMounted;
  useEffect(() => {
    hasMounted = true;
  }, []);

  return (
    <motion.div
      key={pathname}
      initial={animateIn ? { opacity: 0, y: 6 } : false}
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
