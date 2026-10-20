"use client";

/**
 * The drei <View> half of SceneSlot. Split out so three.js only loads when
 * a scene is actually going to render.
 *
 * <View> renders a plain <div> here in the page, and "tunnels" its children
 * into <View.Port /> inside the shared canvas. Each frame it measures the
 * div with getBoundingClientRect() and draws the scene into exactly that
 * rectangle. Views that are scrolled off screen are skipped entirely, so a
 * scene at the bottom of the page costs nothing while you're at the top.
 */

import { View } from "@react-three/drei";
import type { ReactNode } from "react";

export function SceneSlotView({ children }: { children: ReactNode }) {
  return <View className="absolute inset-0">{children}</View>;
}
