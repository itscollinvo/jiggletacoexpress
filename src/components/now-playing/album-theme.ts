/**
 * Turn an album palette into the site's three accent colors for the
 * current page background. Pure function, no React, easy to test.
 *
 *   --accent-coral  main accent: "jiggletaco", borders on hover
 *   --accent-gold   second accent: "&", school name
 *   --accent-hover  link hover color
 */

import type { AlbumPalette } from "@/lib/integrations/album-palette";
import {
  ensureContrast,
  hexToHsl,
  hslToHex,
  hueDistance,
  luminance,
} from "@/lib/color";

export interface AccentColors {
  coral: string;
  gold: string;
  hover: string;
}

/**
 * Returns null when the album shouldn't recolor the site: no usable
 * swatches, or a black-and-white cover (gray accents would look broken,
 * so we keep the theme's own colors instead).
 */
export function accentsFromPalette(
  palette: AlbumPalette,
  background: string,
): AccentColors | null {
  const primary =
    palette.vibrant ?? palette.lightVibrant ?? palette.darkVibrant ?? palette.muted;
  if (!primary) return null;

  const [h, s, l] = hexToHsl(primary);
  if (s < 15) return null; // basically gray

  // Second accent: the first other swatch whose hue is clearly different,
  // so the two accents don't look like the same color twice. If the cover
  // is all one hue, use a much lighter/darker shade of it instead (a
  // monochrome cover gets a monochrome theme, not a made-up color).
  const candidates = [
    palette.lightVibrant,
    palette.muted,
    palette.lightMuted,
    palette.darkVibrant,
  ].filter((c): c is string => c !== null);
  const secondary =
    candidates.find((c) => {
      const [h2, s2] = hexToHsl(c);
      return s2 >= 15 && hueDistance(h, h2) >= 25;
    }) ?? hslToHex([h, s, l > 50 ? l - 30 : l + 30]);

  const darkBg = luminance(background) < 0.5;
  // Keep accents punchy even if the cover is fairly washed out.
  const boost = (hex: string) => {
    const [hh, ss, ll] = hexToHsl(hex);
    return hslToHex([hh, Math.max(ss, 55), ll]);
  };

  const coral = ensureContrast(boost(primary), background);
  const gold = ensureContrast(boost(secondary), background);
  // Hover = the main accent pushed a bit further from the background.
  const [ch, cs, cl] = hexToHsl(coral);
  const hover = ensureContrast(
    hslToHex([ch, cs, Math.min(95, Math.max(5, cl + (darkBg ? 10 : -10)))]),
    background,
  );

  return { coral, gold, hover };
}
