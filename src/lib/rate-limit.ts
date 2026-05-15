/**
 * Rate limiters backed by Upstash Redis.
 *
 * Why these specific limits:
 *   Login (5 / 15 min per IP)  — a human entering a password legitimately
 *     wrong 5 times in 15 minutes is rare. A bot getting blocked at 5 is
 *     painful enough to discourage brute force, lenient enough not to lock
 *     you out if you mis-type a few times.
 *   2FA verify (5 / 15 min per IP) — same logic. With a 6-digit code space
 *     of 1M, 5 attempts per 15 min keeps the expected guess time absurd.
 *
 * Sliding window (vs fixed window):
 *   Fixed windows let bursts through at boundaries (4 attempts at 14:59,
 *   then 5 more at 15:00 = 9 in 1 minute). Sliding windows count over a
 *   moving period, which is closer to what most users intuit by "5 per 15
 *   min".
 *
 * Per-IP keying:
 *   Not perfect — an attacker behind a botnet rotates IPs, and shared
 *   networks (e.g. an office) could hit the limit collectively. But it's
 *   the standard first line of defense and Vercel reliably surfaces the
 *   real client IP via x-forwarded-for.
 */

import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Lazy initialization — same pattern we used for the DB client. Module
 * evaluation is side-effect-free so `next build` doesn't need Upstash
 * env vars (CI doesn't have them). Failures move from import time to
 * call time.
 */

let _login: Ratelimit | undefined;
let _twoFa: Ratelimit | undefined;

/**
 * Pick whatever env vars Vercel's marketplace integration provided.
 * Vercel sometimes ships UPSTASH_REDIS_REST_URL / TOKEN, sometimes
 * KV_REST_API_URL / TOKEN (the legacy "Vercel KV" naming), depending
 * on when you set up the integration. Both point at the same backend.
 */
function buildRedis(): Redis {
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

export const loginRateLimit = {
  limit(key: string) {
    if (!_login) {
      _login = new Ratelimit({
        redis: buildRedis(),
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "rl:login",
        analytics: true,
      });
    }
    return _login.limit(key);
  },
};

export const twoFaRateLimit = {
  limit(key: string) {
    if (!_twoFa) {
      _twoFa = new Ratelimit({
        redis: buildRedis(),
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "rl:2fa",
        analytics: true,
      });
    }
    return _twoFa.limit(key);
  },
};

/**
 * Extract a client IP for keying the rate limit.
 *
 * On Vercel, x-forwarded-for contains the real client IP first, then any
 * proxies. We take the first entry. Falls back to x-real-ip and finally
 * "unknown" — the worst case is everyone hitting the same key from a
 * deployment with stripped headers, which would just rate-limit globally
 * (annoying but not insecure).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}
