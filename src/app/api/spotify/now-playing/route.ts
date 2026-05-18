/**
 * GET /api/spotify/now-playing
 *
 * Public endpoint — no auth required. The front page calls this directly
 * from the browser to drive the NowPlaying widget.
 *
 * Response shapes:
 *   { status: "not_connected" }          — no Spotify token in DB
 *   { status: "not_playing" }            — token valid, nothing playing
 *   { status: "playing", track: {...} }  — actively playing
 *   { status: "error" }                  — something blew up (always 200 so
 *                                          the client doesn't retry aggressively)
 *
 * Redis cache: 30 s under key "spotify:now-playing".
 * Cache-Control header also set so CDN/browser avoid redundant fetches.
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getValidSpotifyAccessToken } from "@/lib/db/queries/integration-tokens";
import { getCurrentlyPlaying } from "@/lib/integrations/spotify";

const CACHE_KEY = "spotify:now-playing";
const CACHE_TTL_S = 30;

function getRedis(): Redis {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis env vars missing. Expected UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN.",
    );
  }
  return new Redis({ url, token });
}

export type NowPlayingPayload =
  | { status: "not_connected" }
  | { status: "not_playing" }
  | { status: "error" }
  | {
      status: "playing";
      track: {
        name: string;
        artist: string;
        album: string;
        albumArt: string | null;
        url: string;
      };
    };

const cacheHeaders = {
  "Cache-Control": `public, s-maxage=${CACHE_TTL_S}, stale-while-revalidate=${CACHE_TTL_S}`,
};

export async function GET(): Promise<NextResponse> {
  try {
    const redis = getRedis();

    // 1. Check Redis cache
    const cached = await redis.get<NowPlayingPayload>(CACHE_KEY);
    if (cached !== null) {
      return NextResponse.json(cached, { headers: cacheHeaders });
    }

    // 2. Get a valid access token (refreshes automatically if expired)
    const accessToken = await getValidSpotifyAccessToken();
    if (!accessToken) {
      // Don't cache — once the user connects we want fresh data immediately
      return NextResponse.json({ status: "not_connected" } satisfies NowPlayingPayload);
    }

    // 3. Ask Spotify what's playing
    const nowPlaying = await getCurrentlyPlaying(accessToken);

    let payload: NowPlayingPayload;

    if (!nowPlaying || !nowPlaying.is_playing || !nowPlaying.item) {
      payload = { status: "not_playing" };
    } else {
      const track = nowPlaying.item;
      payload = {
        status: "playing",
        track: {
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          albumArt: track.album.images[0]?.url ?? null,
          url: track.external_urls.spotify,
        },
      };
    }

    // 4. Cache for 30 s
    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL_S });

    return NextResponse.json(payload, { headers: cacheHeaders });
  } catch (err) {
    console.error("[/api/spotify/now-playing]", err);
    return NextResponse.json({ status: "error" } satisfies NowPlayingPayload);
  }
}
