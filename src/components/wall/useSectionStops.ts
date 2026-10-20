"use client";

/**
 * Where each page section sits, expressed in the same 0–1 scroll-progress
 * units as useScrollProgress. A section's "stop" is the progress value at
 * which its top edge reaches 30% of the way down the screen (roughly when
 * you start reading it). That's where its bolt goes on the wall.
 *
 * Positions change when images load, fonts swap, or the window resizes,
 * so we re-measure whenever the page's size changes (ResizeObserver).
 */

import { useEffect, useState } from "react";

export interface WallSection {
  id: string;
  label: string;
}

export interface SectionStop extends WallSection {
  stop: number;
}

export function useSectionStops(sections: WallSection[]): SectionStop[] {
  const [stops, setStops] = useState<SectionStop[]>([]);
  const key = sections.map((s) => s.id).join(",");

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return setStops([]);
      const next: SectionStop[] = [];
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue; // e.g. no "Recently shipped" when there are no posts
        const top = el.getBoundingClientRect().top + window.scrollY;
        const stop = (top - window.innerHeight * 0.3) / max;
        next.push({ ...s, stop: Math.min(1, Math.max(0, stop)) });
      }
      setStops(next);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    measure();
    return () => ro.disconnect();
    // `key` stands in for `sections` so a new array each render doesn't
    // re-run this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return stops;
}
