/**
 * Database schema. Each `pgTable` call describes one table.
 *
 * Drizzle's killer feature: the same code that creates the table in Postgres
 * ALSO produces TypeScript types for rows. `typeof projects.$inferSelect`
 * is a type representing what you get back from a SELECT; `$inferInsert` is
 * the shape required to INSERT a new row. No separate type definitions, no
 * code-generation step.
 *
 * Workflow when you add or change a table:
 *   1. Edit this file
 *   2. Run `npm run db:generate`  (drizzle-kit diffs schema → SQL migration)
 *   3. Run `npm run db:migrate`   (applies the SQL to your database)
 *   4. Commit both this file AND the generated drizzle/*.sql files
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  // Auto-incrementing primary key. `serial` is a Postgres convenience type
  // for "integer that auto-increments". Alternative: `uuid` if you want
  // unguessable IDs (better for public-facing endpoints), but for projects
  // visible on the front page anyway, integers are simpler.
  id: serial("id").primaryKey(),

  // varchar(255) is plenty for project titles. text is for the longer body.
  // The {length: N} only constrains the column size in Postgres; TS sees
  // both as `string`.
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),

  // Optional URL fields (nullable — no .notNull()). Project might not have
  // a public GitHub repo or thumbnail.
  githubUrl: varchar("github_url", { length: 500 }),
  imageUrl: varchar("image_url", { length: 500 }),

  // Used in Phase 2d for the admin "show on front page" toggle.
  featured: boolean("featured").notNull().default(false),

  // For ordering on the /projects page. Lower numbers render first.
  // Defaulting to 0 means "shows at the top until manually ordered".
  displayOrder: integer("display_order").notNull().default(0),

  // `withTimezone: true` stores `timestamptz` in Postgres — recommended over
  // plain `timestamp` because it normalizes to UTC and renders correctly
  // regardless of the server's locale. `defaultNow()` becomes `DEFAULT NOW()`
  // in the SQL, set by Postgres on insert.
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Inferred TypeScript types — use these everywhere instead of writing your own.
 * If you add/remove/rename a column, the type updates automatically.
 */
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

/* ----------------------------------------------------------------------------
 * Users
 *
 * For now: single admin. The schema supports more users later (no
 * `is_admin` flag yet, but easy to add). Email is unique because it's
 * effectively the username.
 *
 * `password_hash` stores a bcrypt hash; we never store the plaintext.
 * `totp_secret` is added now (nullable) so we can enable 2FA in Phase 2c
 * without another migration.
 * ------------------------------------------------------------------------- */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  totpSecret: varchar("totp_secret", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/* ----------------------------------------------------------------------------
 * Integration tokens
 *
 * One row per third-party service we've authenticated to (Spotify first,
 * future: Outlook, Slack, Claude API, etc.). The `provider` column is a
 * short string key like "spotify", "slack". We enforce uniqueness on it
 * because we only ever have one active connection per provider per admin.
 *
 * `accessToken` — short-lived (typically ~1 hour for Spotify). We send it
 *   on each API call.
 * `refreshToken` — long-lived (months/years). Used to mint a new
 *   accessToken when the current one expires.
 * `expiresAt` — when the current accessToken stops working. Compared to
 *   "now" before each API call; if expired, we refresh.
 * `scope` — space-separated OAuth scopes the user actually granted.
 *   Useful for sanity-checking permissions later.
 * ------------------------------------------------------------------------- */
export const integrationTokens = pgTable("integration_tokens", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type NewIntegrationToken = typeof integrationTokens.$inferInsert;

/* ----------------------------------------------------------------------------
 * Vault photos
 *
 * Stores photos uploaded via /admin/vault. The `filename` is what appears
 * in the terminal (e.g. "joshua-tree.jpg") — it's used as the argument to
 * `cat`. The `url` is the Vercel Blob public URL. `takenAt` is a freeform
 * string (e.g. "nov 2025") displayed as metadata in the terminal and gallery.
 * ------------------------------------------------------------------------- */
export const vaultPhotos = pgTable("vault_photos", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  takenAt: varchar("taken_at", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VaultPhoto = typeof vaultPhotos.$inferSelect;
export type NewVaultPhoto = typeof vaultPhotos.$inferInsert;

/* ----------------------------------------------------------------------------
 * Vault notes
 *
 * Short freeform text entries that appear in the terminal as `notes/` files.
 * `slug` becomes the filename in the terminal (e.g. "scattered-thoughts.md").
 * `displayDate` is an optional freeform date string shown as metadata
 * (e.g. "2026-03-12") — separate from createdAt because you may want to
 * backdate entries.
 * ------------------------------------------------------------------------- */
export const vaultNotes = pgTable("vault_notes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  displayDate: varchar("display_date", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VaultNote = typeof vaultNotes.$inferSelect;
export type NewVaultNote = typeof vaultNotes.$inferInsert;

/* ----------------------------------------------------------------------------
 * Vault journal
 *
 * Longer personal journal entries. `entryDate` is a freeform date string that
 * doubles as the terminal filename (e.g. "2026-01-15" → "2026-01-15.md").
 * Using a string here (not a date column) so you can write "jan 2026" or
 * other imprecise dates without forcing a full timestamp.
 * ------------------------------------------------------------------------- */
export const vaultJournal = pgTable("vault_journal", {
  id: serial("id").primaryKey(),
  entryDate: varchar("entry_date", { length: 100 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VaultJournalEntry = typeof vaultJournal.$inferSelect;
export type NewVaultJournalEntry = typeof vaultJournal.$inferInsert;
