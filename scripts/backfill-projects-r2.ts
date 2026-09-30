/**
 * R.2 backfill: populate techStack / status / demoUrl / featured on the
 * existing projects.
 *
 * Non-destructive — this script UPDATEs by id, never INSERTs or DELETEs.
 * Safe to run against prod. Any project not listed here is untouched.
 *
 * Run once with: `npx tsx scripts/backfill-projects-r2.ts`
 * Then delete this file (or leave it; it's idempotent).
 *
 * If a project's title doesn't match anything here, it's silently skipped
 * and you can edit it by hand in /admin/projects.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

import { projects as projectsTable } from "../src/lib/db/schema";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema: { projects: projectsTable } });

/**
 * Map: title (must match DB row exactly) → fields to update.
 * Add rows here for whatever's currently in your DB. What's below is a
 * best-guess starting point based on the original seed.ts — tweak the
 * tech lists / status / featured flag before running if any project has
 * evolved since it was first seeded.
 */
const BACKFILL: Record<
  string,
  {
    techStack: string[];
    status?: "active" | "wip" | "archived";
    featured?: boolean;
    demoUrl?: string | null;
  }
> = {
  "SecureLog-AES": {
    techStack: ["React", "FastAPI", "PostgreSQL", "Docker", "RSA/AES"],
    status: "active",
    featured: true, // flagship
  },
  "Oshibana Flower Classifier": {
    techStack: ["PyTorch", "Python", "Quantization", "Pruning"],
    status: "active",
  },
  "Airbnb Price Predictor": {
    techStack: ["Python", "Pandas", "scikit-learn", "FastAPI"],
    status: "archived",
  },
  // Add more rows here as needed. Titles must match /admin/projects exactly.
};

async function backfill() {
  let updated = 0;
  let skipped = 0;

  for (const [title, fields] of Object.entries(BACKFILL)) {
    const patch: Record<string, unknown> = {
      techStack: fields.techStack,
      updatedAt: new Date(),
    };
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.featured !== undefined) patch.featured = fields.featured;
    if (fields.demoUrl !== undefined) patch.demoUrl = fields.demoUrl;

    const result = await db
      .update(projectsTable)
      .set(patch)
      .where(eq(projectsTable.title, title))
      .returning({ id: projectsTable.id, title: projectsTable.title });

    if (result.length === 0) {
      console.log(`  skip: no project matched "${title}"`);
      skipped++;
    } else {
      console.log(`  updated: "${title}" (id ${result[0]!.id})`);
      updated++;
    }
  }

  console.log(`\nDone. updated=${updated}, skipped=${skipped}.`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
