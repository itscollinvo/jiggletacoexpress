/**
 * Shared Upstash Redis client for server code.
 *
 * Vercel's Upstash integration names the env vars KV_REST_API_*, while a
 * manual Upstash setup uses UPSTASH_REDIS_REST_*. Accept either.
 */

import { Redis } from "@upstash/redis";

export function getRedis(): Redis {
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
