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
