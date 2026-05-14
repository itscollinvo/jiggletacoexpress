"use client";

import { useSyncExternalStore } from "react";
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

/**
 * Hook that returns false on the server and during the first client render
 * (so hydration matches), then true on every render afterward.
 *
 * `useSyncExternalStore` has special handling for SSR:
 *   - The server uses `getServerSnapshot` → returns false.
 *   - The client uses `getServerSnapshot` during hydration so the result
 *     matches the server, then re-renders using `getSnapshot` → returns true.
 *
 * This avoids both the hydration mismatch AND the React 19 lint rule
 * `react-hooks/set-state-in-effect` that complains about the older
 * `useState(false) + useEffect(() => setState(true))` pattern.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {}, // subscribe: no external store to listen to, return a no-op unsubscribe
    () => true, // getSnapshot: on the client, we are mounted
    () => false, // getServerSnapshot: on the server (and during hydration), we are not
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  // Until we're past hydration, render a placeholder identical to what the
  // server sent. After hydration, swap to the real button reflecting the
  // user's stored theme. No flash of wrong content; no hydration warning.
  if (!isClient) {
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
