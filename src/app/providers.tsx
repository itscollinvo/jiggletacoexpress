"use client";

/**
 * Client-side providers. Anything that uses React context (theme, auth, query
 * cache later, etc.) goes through here. Server components can't use hooks, so
 * the `"use client"` directive at the top is required.
 *
 * We keep this file separate from `layout.tsx` (which stays a server component)
 * so the page shell can still be server-rendered. Only the providers wrapping
 * the children become a client boundary.
 */

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      // Set the active theme via a class on <html> ("light" / "dark" / "color").
      // Our globals.css scopes CSS variables under each of those classes.
      attribute="class"
      // Whitelist the themes we support. next-themes uses this to validate
      // values and, importantly, to know what to remove when switching.
      themes={["light", "dark", "color"]}
      // What to use when the user hasn't picked yet. "dark" matches your
      // primary palette; tweak any time.
      defaultTheme="dark"
      // Disable auto-following OS dark mode. We want the user's choice to win,
      // and `enableSystem` would add a "system" theme to the rotation.
      enableSystem={false}
      // Skip the CSS transition during the actual swap so theme changes feel
      // instant. The `transition` rule in globals.css handles smooth feel for
      // hover states / other state changes.
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
