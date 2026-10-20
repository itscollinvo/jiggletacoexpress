"use client";

/**
 * Cursor spotlight: a soft glow that follows the mouse across a card.
 *
 * The component only tracks the cursor. On every move it writes the
 * position into two CSS variables (--spot-x / --spot-y) on its own element.
 * A `.spotlight` layer inside the card (styled in globals.css) paints a
 * radial gradient centered on those variables. Writing CSS variables
 * directly skips React re-renders entirely, so it stays smooth at 120 Hz.
 *
 * Usage: wrap a card in <Spotlight>, and put
 *   <div className="spotlight" aria-hidden />
 * inside the card's rounded, overflow-hidden container.
 */

import type { PointerEvent, ReactNode } from "react";

export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return; // no glow under a finger
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div className={`spot-root ${className ?? ""}`} onPointerMove={onPointerMove}>
      {children}
    </div>
  );
}
