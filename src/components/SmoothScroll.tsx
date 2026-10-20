"use client";

/**
 * Smooth, eased scrolling for the public pages, powered by Lenis.
 *
 * What Lenis does:
 *   Normally a mouse wheel moves the page in hard ~100px jumps. Lenis
 *   catches wheel events and animates the real window scroll toward the
 *   target a little every frame (linear interpolation, "lerp"). The page
 *   still uses native scrolling under the hood, so position: sticky,
 *   anchor links, Ctrl+F and screen readers all keep working.
 *
 *   Touch scrolling is left alone (phones already have momentum scrolling
 *   that feels right), and so is anything inside an element marked
 *   `data-lenis-prevent` (useful for inner scroll areas).
 *
 * Why it matters later:
 *   Lenis exposes one smooth scroll value every frame. The climbing wall
 *   (PR 6–7) will read it so the climber moves smoothly instead of in
 *   wheel-sized steps.
 *
 * Accessibility:
 *   Only enabled on the "full" motion tier. Reduced-motion visitors and
 *   touch devices get the browser's normal scrolling.
 */

import "lenis/dist/lenis.css";
import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useThreeStage } from "@/components/three/ThreeProvider";

/**
 * Rendered next to the page, not around it. If it wrapped the page, the
 * moment the motion tier became known React would see a different tree
 * shape and remount the whole page. As a sibling, turning Lenis on or off
 * never touches the page content.
 *
 * Components anywhere can still read the instance with `useLenis()`:
 * in `root` mode Lenis also publishes itself to a global store.
 */
export function SmoothScroll() {
  const { tier } = useThreeStage();

  if (tier !== "full") return null;

  return (
    <>
      <ReactLenis
        // `root` = smooth the window itself rather than a wrapper div.
        root
        options={{
          lerp: 0.1, // move 10% of the remaining distance each frame
          anchors: true, // <a href="#projects"> glides instead of jumping
          autoRaf: true, // Lenis runs its own requestAnimationFrame loop
        }}
      />
      <ResetOnNavigate />
    </>
  );
}

/**
 * Next.js scrolls to the top when you change pages, but Lenis remembers
 * its own target position and would glide you back down. Snap Lenis to
 * the top (no animation) on every route change so the two agree.
 */
function ResetOnNavigate() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}
