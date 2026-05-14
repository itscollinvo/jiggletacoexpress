/**
 * Password hashing utilities.
 *
 * NEVER store passwords in plaintext. NEVER compare with `===`. Always
 * `hashPassword` before storing, and always `verifyPassword` to check.
 *
 * `bcryptjs` automatically generates a random salt per password and embeds
 * it in the resulting hash string, so two users with the same password
 * still produce different hashes (defeats rainbow tables).
 *
 * Cost factor 12 means ~250ms per hash on modern CPUs — slow enough to
 * make brute-force attacks expensive, fast enough that a single login
 * doesn't feel sluggish. Bump higher (13, 14) when CPUs get faster, lower
 * (10) only if you have a high-throughput login endpoint.
 */

import "server-only";
import bcrypt from "bcryptjs";

const COST_FACTOR = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, COST_FACTOR);
}

export async function verifyPassword(
  plaintext: string,
  storedHash: string,
): Promise<boolean> {
  // bcrypt.compare is constant-time — it always takes the same wall-clock
  // time regardless of where the inputs first differ. That prevents
  // *timing attacks* where an attacker measures response time to learn
  // whether the first character was correct, then the second, etc.
  return bcrypt.compare(plaintext, storedHash);
}
