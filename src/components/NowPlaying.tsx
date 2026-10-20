"use client";

import { Music } from "lucide-react";
import { useNowPlaying } from "@/components/now-playing/NowPlayingProvider";

/** Must be rendered inside <NowPlayingProvider>, which does the polling. */
export function NowPlaying() {
  const state = useNowPlaying();

  if (state === null) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-foreground/5 px-4 py-3 text-sm">
        <Music className="h-4 w-4 text-muted" />
        <div className="h-4 w-48 rounded bg-foreground/10" />
      </div>
    );
  }

  if (state.status === "not_connected" || state.status === "error") {
    return null;
  }

  if (state.status === "not_playing") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-foreground/5 px-4 py-3 text-sm">
        <Music className="h-4 w-4 text-muted" />
        <span className="text-muted">Not listening right now</span>
      </div>
    );
  }

  const { track } = state;
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-border bg-foreground/5 px-4 py-3 text-sm transition-colors hover:border-accent-coral"
    >
      {track.albumArt ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={track.albumArt} alt={track.album} width={36} height={36} className="rounded" />
      ) : (
        <Music className="h-4 w-4 shrink-0 text-accent-coral" />
      )}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          <EqBars />
          <span className="text-xs text-muted">Now playing</span>
        </div>
        <span className="truncate font-medium text-foreground transition-colors group-hover:text-accent-coral">
          {track.name}
        </span>
        <span className="truncate text-xs text-muted">{track.artist}</span>
      </div>
    </a>
  );
}

function EqBars() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      <span className="w-[2px] rounded-sm bg-accent-coral animate-bounce" style={{ height: 10, animationDuration: "0.8s", animationDelay: "0ms" }} />
      <span className="w-[2px] rounded-sm bg-accent-coral animate-bounce" style={{ height: 6, animationDuration: "0.8s", animationDelay: "160ms" }} />
      <span className="w-[2px] rounded-sm bg-accent-coral animate-bounce" style={{ height: 8, animationDuration: "0.8s", animationDelay: "320ms" }} />
    </span>
  );
}
