"use client";

/**
 * Page scroll progress, 0 at the top and 1 at the bottom.
 *
 * Lenis smooths scrolling by moving the real window scroll a little every
 * frame, so listening to the normal `scroll` event already gives smooth
 * values. We throttle state updates to one per animation frame: scroll
 * events can fire several times per frame, and re-rendering more often
 * than the screen draws is wasted work.
 */

import { useEffect, useState } from "react";

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}
