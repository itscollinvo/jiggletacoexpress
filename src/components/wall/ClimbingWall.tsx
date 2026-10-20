"use client";

/**
 * A lead-climbing wall that doubles as the page's section nav.
 *
 * The idea: the strip is a climbing wall, the bottom is the ground (top of
 * the page) and the top is the finish (bottom of the page). As you scroll
 * down, the climber goes up. Each page section is a bolt on the wall; when
 * the climber passes it, a quickdraw clips in and the rope runs through
 * it, the way a lead climber protects themselves on the way up.
 *
 * The quickdraws are real buttons: hover/focus shows the section name,
 * click scrolls there.
 *
 * Drawing: one SVG sized to the strip. All positions are computed from two
 * numbers in 0–1 "scroll progress" units: where you are (useScrollProgress)
 * and where each section is (useSectionStops). progressToY() maps them
 * onto the wall.
 *
 * Desktop: a 56px wall between the sidebar and the content, with holds,
 * labels, buttons and a 3D climber (Climber3D). Phones and reduced motion:
 * the climber is a 2D dot, and on phones the wall is a very thin strip
 * with just the rope, bolts and climber (no room for tap targets).
 */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { SceneSlot } from "@/components/three/SceneSlot";
import { useThreeStage } from "@/components/three/ThreeProvider";
import { useScrollProgress } from "./useScrollProgress";
import { useSectionStops, type WallSection } from "./useSectionStops";

// Gym-hold colors: the two site accents plus a few classic plastic colors.
const HOLD_COLORS = [
  "var(--accent-coral)",
  "var(--accent-gold)",
  "#4cc9f0",
  "#80ed99",
  "#b388eb",
];

/** Tiny seeded random generator (mulberry32), so holds land in the same
 *  spots on every visit and on the server and client alike. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAD = 28;

// The 3D climber (three.js + the model) loads only on desktop with motion on.
const Climber3D = dynamic(() => import("./Climber3D"), { ssr: false });

/** Size of the 3D climber's box; wider than the wall so limbs can reach out. */
const CLIMBER_BOX = 104; // keep the ground and the top anchor off the very edges

export function ClimbingWall({ sections }: { sections: WallSection[] }) {
  const progress = useScrollProgress();
  const stops = useSectionStops(sections);
  const lenis = useLenis();
  const { tier } = useThreeStage();
  const wallRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track the strip's pixel size so the SVG draws 1:1 (crisp lines).
  useEffect(() => {
    const el = wallRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const thin = w > 0 && w < 24; // phone strip
  const progressToY = (p: number) => PAD + (h - PAD * 2) * (1 - p);
  const midX = w / 2;
  // Bolts alternate a little left/right of center, like a real route.
  const boltX = (i: number) => midX + (thin ? 0 : i % 2 === 0 ? -8 : 8);

  const holds = useMemo(() => {
    if (!h || thin) return [];
    const rand = seeded(7);
    const out = [];
    for (let y = PAD; y < h - PAD; y += 34 + rand() * 22) {
      out.push({
        x: w * (0.18 + rand() * 0.64),
        y,
        rx: 4 + rand() * 5,
        ry: 3 + rand() * 3,
        rot: rand() * 180,
        color: HOLD_COLORS[Math.floor(rand() * HOLD_COLORS.length)],
      });
    }
    return out;
  }, [w, h, thin]);

  const climberY = progressToY(progress);
  // Desktop with motion allowed gets the 3D climber; phones and reduced
  // motion keep the 2D dot.
  const show3D = !thin && w > 0 && (tier === "full" || tier === "lite");
  const boltStops = useMemo(() => stops.map((s) => s.stop), [stops]);
  const clipped = stops.filter((s) => progress >= s.stop - 0.001);
  // Rope: from the ground, up through every clipped bolt, to the climber.
  const rope = [
    `${midX},${h - PAD / 2}`,
    ...clipped.map((s) => `${boltX(stops.indexOf(s))},${progressToY(s.stop)}`),
    `${midX},${climberY}`,
  ].join(" ");

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    // With Lenis active, let it do the glide; otherwise native smooth scroll.
    if (lenis) lenis.scrollTo(el, { offset: -64 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none fixed z-20 top-[57px] bottom-0 left-0 w-1.5 lg:top-6 lg:bottom-6 lg:left-[17.5rem] lg:w-14"
    >
      <div
        ref={wallRef}
        className="relative h-full w-full rounded-full bg-foreground/5 lg:rounded-2xl lg:border lg:border-border"
      >
        {h > 0 ? (
          <svg
            width={w}
            height={h}
            className="absolute inset-0 overflow-visible"
            aria-hidden
          >
            {holds.map((hd, i) => (
              <ellipse
                key={i}
                cx={hd.x}
                cy={hd.y}
                rx={hd.rx}
                ry={hd.ry}
                transform={`rotate(${hd.rot} ${hd.x} ${hd.y})`}
                fill={hd.color}
                opacity={0.55}
              />
            ))}

            <polyline
              points={rope}
              fill="none"
              stroke="var(--accent-coral)"
              strokeWidth={thin ? 1.5 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {stops.map((s, i) => {
              const x = boltX(i);
              const y = progressToY(s.stop);
              const isClipped = progress >= s.stop - 0.001;
              return (
                <g key={s.id}>
                  {/* Bolt hanger */}
                  <circle
                    cx={x}
                    cy={y}
                    r={thin ? 2 : 3.5}
                    fill="var(--background)"
                    stroke="var(--foreground)"
                    strokeOpacity={0.6}
                    strokeWidth={1.5}
                  />
                  {/* Quickdraw: a short sling and a carabiner below the
                      bolt. Scales in when the climber clips it. */}
                  {!thin ? (
                    <g
                      className="quickdraw"
                      style={{
                        transformOrigin: `${x}px ${y}px`,
                        transform: isClipped ? "scale(1)" : "scale(0)",
                      }}
                    >
                      <line
                        x1={x}
                        y1={y + 3}
                        x2={x}
                        y2={y + 12}
                        stroke="var(--accent-gold)"
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                      <ellipse
                        cx={x}
                        cy={y + 16}
                        rx={3}
                        ry={4.5}
                        fill="none"
                        stroke="var(--foreground)"
                        strokeWidth={1.5}
                      />
                    </g>
                  ) : null}
                </g>
              );
            })}

            {/* 2D climber for phones and reduced motion: a chalky dot with
                a ring in the accent color. */}
            {show3D ? null : <circle
              cx={midX}
              cy={climberY}
              r={thin ? 3 : 6}
              fill="var(--foreground)"
              stroke="var(--accent-coral)"
              strokeWidth={2}
            />}
          </svg>
        ) : null}

        {/* 3D climber. The SceneSlot's box follows the climber's position;
            drei's View redraws the robot wherever the box is each frame. */}
        {show3D ? (
          <div
            className="pointer-events-none absolute"
            style={{
              left: midX - CLIMBER_BOX / 2,
              top: climberY - CLIMBER_BOX * 0.62,
              width: CLIMBER_BOX,
              height: CLIMBER_BOX,
            }}
          >
            <SceneSlot className="h-full w-full">
              <Climber3D progress={progress} boltStops={boltStops} />
            </SceneSlot>
          </div>
        ) : null}

        {/* Clickable quickdraws, positioned over their bolts. Desktop only:
            on phones the strip is too thin for tap targets. */}
        {!thin
          ? stops.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(s.id)}
                aria-label={`Jump to ${s.label}`}
                className="group pointer-events-auto absolute hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-accent-coral lg:block"
                style={{ left: boltX(i), top: progressToY(s.stop) + 6 }}
              >
                <span className="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {s.label}
                </span>
              </button>
            ))
          : null}
      </div>
    </nav>
  );
}
