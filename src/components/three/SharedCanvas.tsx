"use client";

/**
 * The one WebGL canvas every 3D piece on the site draws into.
 * Only ever loaded through ThreeProvider's dynamic import.
 *
 * Layout: `position: fixed` over the whole viewport with
 * `pointer-events: none`, so it never blocks clicks or text selection.
 * Each <SceneSlot> is drawn into the part of this canvas that sits on top
 * of its placeholder div.
 */

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import type { MotionTier } from "@/lib/hooks/useMotionTier";

export function SharedCanvas({ tier }: { tier: MotionTier }) {
  return (
    <Canvas
      // Pointer events are read from the whole page instead of the canvas
      // (which ignores the mouse). This is how a scene can still react to
      // the cursor even though the canvas is click-through.
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        // Above the climbing wall (z-20) so the climber draws over it, below
        // the mobile header (z-30) and sidebar (z-40). Click-through anyway.
        zIndex: 25,
      }}
      // Device pixel ratio. A 3x phone screen would render 9x the pixels of
      // a 1x screen. Capping it keeps the GPU cool with no visible loss.
      dpr={tier === "lite" ? [1, 1.25] : [1, 1.5]}
      gl={{
        alpha: true, // transparent background, the page shows through
        antialias: tier === "full",
        powerPreference: "high-performance",
      }}
    >
      {/* Every <View> on the page renders through this port. */}
      <View.Port />
    </Canvas>
  );
}
