/**
 * Seeds the projects table with starter content.
 *
 * Run with: `npm run db:seed`
 *
 * Idempotent: clears existing projects first, then inserts. Safe to re-run
 * during development. Once you have real admin-managed content in production,
 * STOP running this against prod — it'd nuke your real data.
 *
 * The data lives here (instead of a separate src/data file) because the
 * database is now the source of truth; this script is just bootstrap fuel.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import { projects as projectsTable } from "../src/lib/db/schema";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema: { projects: projectsTable } });

const SEED_PROJECTS = [
  {
    title: "SecureLog-AES",
    description:
      "RSA encryption / decryption service with audit logging. React frontend, FastAPI backend, PostgreSQL for log storage, all containerized with Docker. Built for the Blueprint Dev Challenge.",
    githubUrl:
      "https://github.com/itscollinvo/Blueprint-Dev-Challenge-SecureLog",
  },
  {
    title: "Oshibana Flower Classifier",
    description:
      "PyTorch neural net classifying iris species, optimized via weight pruning and FP16 quantization. Held 93% accuracy while shrinking model size by ~9%.",
    githubUrl: "https://github.com/itscollinvo/Oshibana-Flower-Classifier",
  },
  {
    title: "Airbnb Price Predictor",
    description:
      "ML regression on the NYC 2019 Airbnb dataset to estimate listing prices. Pandas + Scikit-learn for the model, served through a FastAPI backend.",
    githubUrl: "https://github.com/itscollinvo/Airbnb-Price-Predictor",
  },
];

async function seed() {
  console.log("Clearing existing projects...");
  await db.delete(projectsTable);

  console.log(`Inserting ${SEED_PROJECTS.length} projects...`);
  await db.insert(projectsTable).values(
    SEED_PROJECTS.map((p, i) => ({
      title: p.title,
      description: p.description,
      githubUrl: p.githubUrl ?? null,
      displayOrder: i,
    })),
  );

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
