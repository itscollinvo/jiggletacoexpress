"use client";

/**
 * Tints the site's accent colors to match the album that's playing.
 *
 * Renders nothing. It writes three CSS variables onto <html>, which
 * override the theme's accent colors everywhere (the sidebar too). Every
 * Tailwind class like `text-accent-coral` reads `var(--accent-coral)`, so
 * no component needs to know this exists.
 *
 * The fade between colors is pure CSS: globals.css registers the accent
 * variables with `@property` as real colors, which lets the browser
 * animate them like any other color (see the comment there).
 *
 * When nothing is playing, or you leave the page, the overrides are
 * removed and the colors fade back to the theme's own.
 */

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { accentsFromPalette } from "./album-theme";
import { useNowPlaying } from "./NowPlayingProvider";

const VARS = ["--accent-coral", "--accent-gold", "--accent-hover"] as const;

function clearAccents(root: HTMLElement) {
  VARS.forEach((v) => root.style.removeProperty(v));
}

export function AlbumTheme() {
  const nowPlaying = useNowPlaying();
  // Re-run when the theme changes: contrast depends on the background.
  const { resolvedTheme } = useTheme();

  const palette =
    nowPlaying?.status === "playing" ? nowPlaying.track.palette : null;

  useEffect(() => {
    const root = document.documentElement;
    if (!palette) {
      clearAccents(root);
      return;
    }

    // Read the *theme's* background. Background isn't overridden, so the
    // computed value is always the current theme's.
    const background = getComputedStyle(root)
      .getPropertyValue("--background")
      .trim();
    const accents = background ? accentsFromPalette(palette, background) : null;
    if (!accents) {
      clearAccents(root);
      return;
    }

    root.style.setProperty("--accent-coral", accents.coral);
    root.style.setProperty("--accent-gold", accents.gold);
    root.style.setProperty("--accent-hover", accents.hover);
  }, [palette, resolvedTheme]);

  // Leaving the page (unmount) hands the colors back to the theme.
  useEffect(() => () => clearAccents(document.documentElement), []);

  return null;
}
