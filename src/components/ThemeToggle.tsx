"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Sparkles } from "lucide-react";

const THEMES = ["light", "dark", "color"] as const;
type ThemeName = (typeof THEMES)[number];

const ICONS: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  color: Sparkles,
};

const LABELS: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  color: "Color",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // `theme` is undefined on the server and during the first client render
  // (next-themes reads localStorage in an effect, so on initial render it
  // hasn't run yet). We use that as our "mounted" signal — no useState,
  // no useEffect needed.
  //
  // Rendering a placeholder until `theme` is defined avoids a hydration
  // mismatch warning: the server-rendered HTML must match what the client
  // renders on its first pass. After hydration, next-themes triggers a
  // re-render with the real value and we swap to the live button.
  if (!theme) {
    return (
      <button
        type="button"
        aria-label="Theme toggle"
        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
      >
        <span className="h-4 w-4" />
        <span className="opacity-0">Theme</span>
      </button>
    );
  }

  const current: ThemeName = THEMES.includes(theme as ThemeName)
    ? (theme as ThemeName)
    : "dark";
  const Icon = ICONS[current];

  function cycle() {
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[current]}. Click to change.`}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:text-accent-hover"
    >
      <Icon className="h-4 w-4" />
      <span>{LABELS[current]}</span>
    </button>
  );
}
