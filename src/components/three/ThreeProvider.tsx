"use client";

/**
 * Shared 3D stage for the whole public site.
 *
 * The problem this solves:
 *   Every <Canvas> is its own WebGL context, and browsers cap how many can
 *   be alive at once (often ~8–16, fewer on phones). The homepage will have
 *   two 3D pieces (the blob and the climber). Two canvases would work today
 *   but doesn't scale, and each one re-uploads its own shaders and textures.
 *
 * The approach:
 *   ONE fixed, full-screen, click-through <Canvas> sits behind the page.
 *   Each 3D piece is a <SceneSlot> placed in normal page layout. The slot
 *   renders an empty <div>, and drei's <View> draws that scene into the
 *   shared canvas exactly where the div is on screen (using the GPU's
 *   "scissor" rectangle). So 3D pieces flow with the layout like any other
 *   element, but there's only one WebGL context.
 *
 * Lazy loading:
 *   three.js + React Three Fiber is a few hundred KB. The canvas is only
 *   downloaded once a page actually mounts a <SceneSlot>, and never when
 *   the visitor prefers reduced motion. Pages with no 3D pay nothing.
 */

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMotionTier, type MotionTier } from "@/lib/hooks/useMotionTier";

// `ssr: false` because WebGL only exists in the browser. Next would
// otherwise try to render the canvas on the server and crash.
const SharedCanvas = dynamic(
  () => import("./SharedCanvas").then((m) => m.SharedCanvas),
  { ssr: false },
);

interface ThreeContextValue {
  tier: MotionTier | null;
  /** Called by each SceneSlot on mount; returns its unregister function. */
  register: () => () => void;
}

const ThreeContext = createContext<ThreeContextValue | null>(null);

export function ThreeProvider({ children }: { children: ReactNode }) {
  const tier = useMotionTier();
  // How many SceneSlots are on the current page. When it drops to 0
  // (navigating to a page without 3D) the canvas unmounts and frees the GPU.
  const [slotCount, setSlotCount] = useState(0);

  const register = useCallback(() => {
    setSlotCount((n) => n + 1);
    return () => setSlotCount((n) => n - 1);
  }, []);

  const value = useMemo(() => ({ tier, register }), [tier, register]);
  const showCanvas = slotCount > 0 && tier !== null && tier !== "off";

  return (
    <ThreeContext.Provider value={value}>
      {children}
      {showCanvas ? <SharedCanvas tier={tier} /> : null}
    </ThreeContext.Provider>
  );
}

export function useThreeStage(): ThreeContextValue {
  const ctx = useContext(ThreeContext);
  if (!ctx) {
    throw new Error("useThreeStage must be used inside <ThreeProvider>");
  }
  return ctx;
}
