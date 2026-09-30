/**
 * Public timeline component. Vertical line down the left, entries stacked
 * with year + title + description. Optional lucide icon renders in the
 * marker circle; falls back to a plain dot when the icon isn't provided
 * or isn't recognized.
 *
 * Kept as a server component — no client interactivity, just data-in.
 * Motion happens via the parent's StaggerList wrapper on /about.
 */

import * as Icons from "lucide-react";
import type { TimelineEntry } from "@/lib/db/schema";

/**
 * Look up a lucide icon by name. Returns the component if it exists,
 * else null so the caller can render a fallback dot. Runtime lookup
 * because icon names live in the DB (not statically known at build).
 *
 * The `unknown` cast + narrow guard is the standard way to satisfy
 * TypeScript when doing runtime name-to-component resolution against
 * a namespace export.
 */
function getLucideIcon(name: string | null | undefined) {
  if (!name) return null;
  const registry = Icons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }> | undefined
  >;
  const Icon = registry[name];
  return Icon ?? null;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <ol className="relative space-y-8">
      {/* Vertical rail behind the entries. Absolute-positioned so it
       * doesn't affect layout, offset just enough that markers sit on it. */}
      <div
        aria-hidden
        className="absolute top-0 bottom-0 left-[11px] w-px bg-border sm:left-[19px]"
      />
      {entries.map((entry) => {
        const Icon = getLucideIcon(entry.icon);
        return (
          <li key={entry.id} className="relative flex gap-4 sm:gap-6">
            {/* Marker */}
            <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent-gold sm:h-10 sm:w-10">
              {Icon ? (
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-accent-gold sm:h-2.5 sm:w-2.5" />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 pb-2">
              <p className="text-xs font-mono uppercase tracking-widest text-accent-gold">
                {entry.year}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {entry.title}
              </h3>
              {entry.description ? (
                <p className="mt-2 text-sm leading-6 text-foreground/70">
                  {entry.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
