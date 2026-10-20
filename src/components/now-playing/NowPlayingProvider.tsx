"use client";

/**
 * One shared Now Playing poller for the page.
 *
 * Before this, the NowPlaying widget fetched on its own. Now the widget,
 * the album-color theming, and (next PR) the 3D blob all need the same
 * data. Lifting the fetch into a context means one request every 30 s
 * no matter how many components read it, and they always agree on what's
 * playing.
 *
 * Polling pauses while the tab is in the background (Page Visibility API)
 * and catches up immediately when you come back.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { NowPlayingPayload } from "@/app/api/spotify/now-playing/route";

const POLL_INTERVAL_MS = 30_000;

// `null` = first request still in flight.
const NowPlayingContext = createContext<NowPlayingPayload | null>(null);

export function NowPlayingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NowPlayingPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function fetchState() {
      try {
        const res = await fetch("/api/spotify/now-playing");
        if (!res.ok) throw new Error(`${res.status}`);
        const data: NowPlayingPayload = await res.json();
        if (!cancelled) setState(data);
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    function start() {
      fetchState();
      timer = setInterval(fetchState, POLL_INTERVAL_MS);
    }
    function stop() {
      clearInterval(timer);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <NowPlayingContext.Provider value={state}>
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying(): NowPlayingPayload | null {
  return useContext(NowPlayingContext);
}
