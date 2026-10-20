"use client";

/**
 * A spot in the page layout where a 3D scene appears.
 *
 * Usage:
 *   <SceneSlot className="aspect-square w-full" fallback={<StaticImage />}>
 *     <Blob />   // React Three Fiber content
 *   </SceneSlot>
 *
 * What renders when:
 *   - Server HTML and first paint: the `fallback` (or an empty box). Keeps
 *     SSR and hydration identical, and gives the page its final size right
 *     away so nothing jumps when the 3D loads.
 *   - No hardware GPU (software WebGL), or the page is still loading: the
 *     fallback. 3D starts once the page is loaded and idle (use3DReady).
 *   - Reduced motion ("off" tier): the fallback, forever. three.js is never
 *     downloaded.
 *   - Otherwise: the live scene, drawn into the same box.
 *
 * Children should be lazy-loaded by the caller too (next/dynamic), so the
 * scene's own code doesn't land in the page's main bundle.
 */

import dynamic from "next/dynamic";
import { useEffect, type ReactNode } from "react";
import { useThreeStage } from "./ThreeProvider";

interface Props {
  /** Size and position the slot like any element. It needs a real height. */
  className?: string;
  /** Static stand-in for SSR, loading, and reduced-motion visitors. */
  fallback?: ReactNode;
  /** The 3D content (React Three Fiber elements). */
  children: ReactNode;
}

export function SceneSlot({ className, fallback = null, children }: Props) {
  const { enabled, register } = useThreeStage();
  const live = enabled;

  // Tell the provider a scene wants the canvas. Only once we know the
  // tier, so reduced-motion visitors never trigger a three.js download.
  useEffect(() => {
    if (!live) return;
    return register();
  }, [live, register]);

  // The wrapper div is the same in every state, so the box keeps its size
  // and the page never shifts when the 3D swaps in.
  return (
    // aria-hidden: the 3D scenes are decoration. Screen readers get the
    // real content (headline, section nav) and skip the empty box.
    <div aria-hidden className={`relative ${className ?? ""}`}>
      {live ? <SceneSlotView>{children}</SceneSlotView> : fallback}
    </div>
  );
}

// The part that imports drei (and therefore three.js) lives in its own
// chunk, so it only downloads once we know the scene will render.
const SceneSlotView = dynamic(
  () => import("./SceneSlotView").then((m) => m.SceneSlotView),
  {
    ssr: false,
    loading: () => null,
  },
);
