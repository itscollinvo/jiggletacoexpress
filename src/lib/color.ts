/**
 * Small color toolkit for turning album colors into readable site accents.
 *
 * Two ideas do the heavy lifting:
 *
 * 1. HSL. Hex/RGB describe how much red, green and blue light to mix,
 *    which is hard to reason about. HSL describes the same color as
 *    hue (which color, 0–360°), saturation (how colorful, 0–100%) and
 *    lightness (0% black → 100% white). "Same color but lighter" becomes
 *    "add to L", which is exactly what we need.
 *
 * 2. Contrast ratio (WCAG). Accents are used for text like "jiggletaco" and
 *    links, so they must stay readable on the page background. WCAG
 *    measures this as a ratio from 1:1 (invisible) to 21:1 (black on
 *    white); 4.5:1 is the standard minimum for normal text. If an album
 *    color is too close to the background, we slide its lightness away
 *    from the background until it passes.
 */

export type RGB = [number, number, number]; // 0–255 each
export type HSL = [number, number, number]; // h 0–360, s 0–100, l 0–100

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function rgbToHsl([r, g, b]: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100]; // a gray: no hue

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
}

export function hslToRgb([h, s, l]: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: HSL) => rgbToHex(hslToRgb(hsl));

/** WCAG relative luminance: perceived brightness, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    // Undo the sRGB gamma curve so we're working with real light amounts.
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; // eyes are most sensitive to green
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudge a color's lightness away from the background until it reaches
 * `min` contrast. Hue and saturation stay put, so it still reads as
 * "the album's color", just lighter (dark themes) or darker (light theme).
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  const [h, s, l0] = hexToHsl(fg);
  const towardWhite = luminance(bg) < 0.5;
  let l = l0;
  let out = fg;
  for (let i = 0; i < 50 && contrastRatio(out, bg) < min; i++) {
    l = Math.min(100, Math.max(0, l + (towardWhite ? 2 : -2)));
    out = hslToHex([h, s, l]);
  }
  return out;
}

/** Shortest distance between two hues on the color wheel, 0–180°. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
