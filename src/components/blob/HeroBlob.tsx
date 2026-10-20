"use client";

/**
 * The homepage hero's 3D blob, wired to Now Playing.
 *
 * Picks the blob's three colors:
 *   - a song with a palette is playing → straight from the album cover
 *     (vibrant + a second swatch + a dark one for shading)
 *   - otherwise → the theme's own accent colors, so the blob always
 *     matches the page
 *
 * Reduced-motion visitors, and everyone during the split second before the
 * 3D code arrives, see a soft CSS gradient orb in the same spot. It uses
 * the accent variables, so it's tinted by the album too.
 */

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SceneSlot } from "@/components/three/SceneSlot";
import { useThreeStage } from "@/components/three/ThreeProvider";
import { useNowPlaying } from "@/components/now-playing/NowPlayingProvider";
import type { BlobColors } from "./AlbumBlob";

const AlbumBlob = dynamic(() => import("./AlbumBlob"), { ssr: false });

function readThemeColors(): BlobColors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { a: v("--accent-coral"), b: v("--accent-gold"), c: v("--background") };
}

export function HeroBlob({ className }: { className?: string }) {
  const nowPlaying = useNowPlaying();
  const { tier } = useThreeStage();
  const { resolvedTheme } = useTheme();
  const [themeColors, setThemeColors] = useState<BlobColors | null>(null);

  const playing = nowPlaying?.status === "playing";
  const palette = playing ? nowPlaying.track.palette : null;

  // The theme fallback has to be read from CSS, which only exists in the
  // browser, so it's read in an effect (and re-read when the theme flips).
  // Read the *theme's* accents: when a palette is active we don't use these.
  useEffect(() => {
    if (palette) return;
    // Read now, and again once AlbumTheme's 1.2 s fade back to the theme
    // colors has finished (mid-fade values would be off).
    const now = setTimeout(() => setThemeColors(readThemeColors()), 0);
    const settled = setTimeout(() => setThemeColors(readThemeColors()), 1300);
    return () => {
      clearTimeout(now);
      clearTimeout(settled);
    };
  }, [palette, resolvedTheme]);

  const colors: BlobColors | null = palette
    ? {
        a: palette.vibrant ?? palette.muted ?? "#888888",
        b: palette.lightVibrant ?? palette.lightMuted ?? palette.muted ?? "#bbbbbb",
        c: palette.darkMuted ?? palette.darkVibrant ?? "#222222",
      }
    : themeColors;

  const fallback = (
    <div
      aria-hidden
      className="absolute inset-[12%] rounded-full opacity-90 blur-xl"
      style={{
        background:
          "radial-gradient(circle at 35% 30%, var(--accent-gold), var(--accent-coral) 55%, transparent 72%)",
      }}
    />
  );

  return (
    <SceneSlot className={className} fallback={fallback}>
      {colors ? (
        <AlbumBlob colors={colors} playing={playing} lite={tier === "lite"} />
      ) : null}
    </SceneSlot>
  );
}
