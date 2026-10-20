/**
 * The homepage headline with a word-by-word entrance and a jiggly name.
 *
 * Pure CSS, on purpose (this is a Server Component, no JavaScript ships):
 *   - The text is in the server HTML, so search engines and slow phones see
 *     it immediately. A JS animation library would render it hidden until
 *     the page hydrates.
 *   - Each word is its own inline-block span with a CSS variable `--i`
 *     (its position). One keyframe animation uses `--i` to stagger the
 *     delay, so the words rise in one after another.
 *   - Hovering "jiggletaco" ripples a little wobble through its letters,
 *     again staggered by each letter's `--i`.
 *
 * Both animations are switched off for reduced motion in globals.css.
 */

import type { CSSProperties } from "react";

type Segment = { text: string; className?: string; jiggle?: boolean };

const SEGMENTS: Segment[] = [
  { text: "I am" },
  { text: "jiggletaco", className: "text-accent-coral", jiggle: true },
  { text: ", I like to make life simple" },
  { text: "&", className: "text-accent-gold" },
  { text: "enjoyable :)" },
];

// `--i` isn't a known CSS property to TypeScript, so widen the type.
const vars = (v: Record<string, number>) => v as CSSProperties;

export function AnimatedHeadline({ className }: { className?: string }) {
  let wordIndex = 0;

  return (
    <h1 className={className}>
      {SEGMENTS.map((seg, s) => {
        // ", I like…" attaches to the previous word with no space before it.
        const glued = seg.text.startsWith(",");
        const words = seg.text.split(" ").filter(Boolean);
        return words.map((word, w) => {
          const i = wordIndex++;
          const space = s === 0 && w === 0 ? "" : glued && w === 0 ? "" : " ";
          return (
            <span key={`${s}-${w}`}>
              {space}
              <span
                className={`reveal-word ${seg.className ?? ""} ${seg.jiggle ? "jiggle" : ""}`}
                style={vars({ "--i": i })}
              >
                {seg.jiggle
                  ? word.split("").map((ch, c) => (
                      <span
                        key={c}
                        className="jiggle-letter"
                        style={vars({ "--i": c })}
                      >
                        {ch}
                      </span>
                    ))
                  : word}
              </span>
            </span>
          );
        });
      })}
    </h1>
  );
}
