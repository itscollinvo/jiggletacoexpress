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
 *
 * Fail-open on Redis errors:
 *   Rate limiting is defense-in-depth, not the primary auth barrier
 *   (bcrypt + TOTP already gate access). If Redis is missing, DNS-broken,
 *   throttled, or the Upstash instance was decommissioned, we log the
 *   error and let the request through. Better a temporarily-unlimited
 *   login endpoint than a totally-broken login endpoint. If Redis is
 *   available but consistently returns errors, we'd see it in logs and
 *   should re-provision Upstash promptly.
 */

import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _login: Ratelimit | undefined;
let _twoFa: Ratelimit | undefined;

/**
 * Pick whatever env vars Vercel's marketplace integration provided.
 * Vercel sometimes ships UPSTASH_REDIS_REST_URL / TOKEN, sometimes
 * KV_REST_API_URL / TOKEN (the legacy "Vercel KV" naming). Returns
 * null if neither is set (rather than throwing) so callers can decide
 * whether to fail open or hard.
 */
function tryBuildRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Shape of the rate-limit result — matches what @upstash/ratelimit returns
 * so callers don't need special-case types. `success: true` always means
 * "let this request through," including our fail-open branch.
 */
type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const ALLOWED: LimitResult = {
  success: true,
  limit: 5,
  remaining: 5,
  reset: Date.now() + 15 * 60 * 1000,
};

/**
 * Wrap `.limit()` with try/catch. If anything goes wrong (Redis unreachable,
 * DNS error, missing env vars, rate limiter constructor throws), log once
 * and fail open. Callers see `success: true` and proceed as if there were
 * no limiter — same behavior as if this file didn't exist.
 */
function makeLimiter(prefix: string, storeRef: { current?: Ratelimit }) {
  return {
    async limit(key: string): Promise<LimitResult> {
      try {
        if (!storeRef.current) {
          const redis = tryBuildRedis();
          if (!redis) {
            console.warn(
              `[rate-limit] Redis env vars missing; failing open for prefix=${prefix}`,
            );
            return ALLOWED;
          }
          storeRef.current = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(5, "15 m"),
            prefix,
            analytics: true,
          });
        }
        return await storeRef.current.limit(key);
      } catch (err) {
        console.error(
          `[rate-limit] check failed for prefix=${prefix}; failing open:`,
          err,
        );
        return ALLOWED;
      }
    },
  };
}

// Ref-cell wrappers so makeLimiter can mutate the cached instance without
// closing over a `let` binding. Same effect as the old `_login`/`_twoFa`
// module-level vars.
const loginStore: { current?: Ratelimit } = {};
const twoFaStore: { current?: Ratelimit } = {};

export const loginRateLimit = makeLimiter("rl:login", loginStore);
export const twoFaRateLimit = makeLimiter("rl:2fa", twoFaStore);

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
