/**
 * Placeholder for the "currently listening to..." card.
 * In Phase 2 this becomes a client component that polls /api/spotify/now-playing.
 * For Phase 1 it's a static server component — no JS shipped to the client.
 */

import { Music } from "lucide-react";

export function NowPlaying() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-foreground/5 px-4 py-3 text-sm">
      <Music className="h-4 w-4 text-accent-coral" />
      <div className="flex flex-col">
        <span className="text-xs text-muted">Currently listening to...</span>
        <span className="text-foreground">
          Spotify integration coming in Phase 2
        </span>
      </div>
    </div>
  );
}
