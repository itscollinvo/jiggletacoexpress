/**
 * Pull the main colors out of an album cover.
 *
 * How it works:
 *   node-vibrant shrinks the image, groups similar pixels together
 *   ("color quantization", here the MMCQ algorithm) and then picks six
 *   named swatches from the groups: Vibrant, Light/Dark Vibrant, Muted,
 *   Light/Dark Muted. Same idea Android uses to tint a notification to
 *   match the album art.
 *
 * Why on the server:
 *   Reading pixels in the browser needs the image host to send CORS headers,
 *   and it would make every visitor download and crunch the image. Doing it
 *   here means it runs once per album, and the result is cached in Redis.
 *
 * Fail-soft:
 *   Any problem (download fails, odd image) returns null and the site keeps
 *   its normal theme colors. Colors are a nice-to-have, never a reason for
 *   the Now Playing widget to break.
 */

import "server-only";
import { Vibrant } from "node-vibrant/node";
import { getRedis } from "@/lib/redis";

export interface AlbumPalette {
  vibrant: string | null;
  lightVibrant: string | null;
  darkVibrant: string | null;
  muted: string | null;
  lightMuted: string | null;
  darkMuted: string | null;
}

// A cover's colors never change, so cache for a long time.
const PALETTE_TTL_S = 60 * 60 * 24 * 30; // 30 days

export async function getAlbumPalette(
  imageUrl: string,
): Promise<AlbumPalette | null> {
  // Spotify image URLs end in a unique id (…/image/ab67616d0000…),
  // which makes a stable cache key.
  const key = `spotify:palette:${imageUrl.split("/").pop()}`;

  try {
    const redis = getRedis();
    const cached = await redis.get<AlbumPalette>(key);
    if (cached) return cached;

    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const p = await Vibrant.from(buffer).getPalette();
    const palette: AlbumPalette = {
      vibrant: p.Vibrant?.hex ?? null,
      lightVibrant: p.LightVibrant?.hex ?? null,
      darkVibrant: p.DarkVibrant?.hex ?? null,
      muted: p.Muted?.hex ?? null,
      lightMuted: p.LightMuted?.hex ?? null,
      darkMuted: p.DarkMuted?.hex ?? null,
    };

    await redis.set(key, palette, { ex: PALETTE_TTL_S });
    return palette;
  } catch (err) {
    console.error("[album-palette]", err);
    return null;
  }
}
