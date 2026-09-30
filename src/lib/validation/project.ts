/**
 * Project input validation.
 *
 * Same schema is used by both create and edit server actions. Zod handles:
 *   - Trimming whitespace
 *   - Required-string enforcement (vs accepting "")
 *   - URL validation (catches typos like "htps://github.com")
 *   - Coercing string form values to boolean / number
 *   - Returning structured error info we can display in the UI
 *
 * `.optional()` + `.or(z.literal(""))` is a common pattern for fields where
 * an empty string from the form should mean "null" — we transform "" → null
 * in the action layer so the DB sees a real null.
 */

import { z } from "zod";

/**
 * Shared: split a CSV string on commas, trim each piece, drop empties.
 * Same helper the blog uses for tags — kept inline here to avoid a
 * cross-module import for a five-line function.
 */
function splitCsv(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Allowed status values. Adding new ones is a matter of extending this
 * tuple; no DB migration required because the schema column is a plain
 * varchar (see schema.ts note).
 */
export const PROJECT_STATUSES = ["active", "wip", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ProjectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required"),

  // GitHub URL is optional. Accept empty string OR a valid URL; we'll
  // normalize "" → null when persisting.
  githubUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),

  imageUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),

  // Form values arrive as strings — `coerce` does string → boolean / number.
  // For boolean, "true"/"on"/"1" → true; everything else → false.
  // For number, parses with parseInt-ish semantics.
  featured: z.coerce.boolean().default(false),

  displayOrder: z.coerce
    .number()
    .int("Display order must be a whole number")
    .nonnegative("Display order can't be negative")
    .default(0),

  // Tech stack arrives from the form as a CSV string (the chip input
  // serializes to a hidden input). We preprocess into string[] before
  // validating each entry's length. No requirement to have any — an
  // empty array is a legit value.
  techStack: z.preprocess(
    (v) => (Array.isArray(v) ? v : splitCsv(v)),
    z.array(z.string().min(1).max(50)).max(20).default([]),
  ),

  // Status must be one of PROJECT_STATUSES. Zod's `.enum()` gives a
  // helpful error message listing the allowed values if someone tries
  // to POST a bogus value.
  status: z.enum(PROJECT_STATUSES).default("active"),

  // Optional live demo URL. Same "" | URL union as githubUrl/imageUrl.
  demoUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),
});

export type ProjectInput = z.infer<typeof ProjectInputSchema>;

/**
 * Convert a parsed ProjectInput into the shape our DB query expects:
 * empty-string URLs become null.
 */
export function toDbInput(input: ProjectInput) {
  return {
    title: input.title,
    description: input.description,
    githubUrl:
      input.githubUrl && input.githubUrl.length > 0 ? input.githubUrl : null,
    imageUrl:
      input.imageUrl && input.imageUrl.length > 0 ? input.imageUrl : null,
    featured: input.featured,
    displayOrder: input.displayOrder,
    techStack: input.techStack,
    status: input.status,
    demoUrl:
      input.demoUrl && input.demoUrl.length > 0 ? input.demoUrl : null,
  };
}
