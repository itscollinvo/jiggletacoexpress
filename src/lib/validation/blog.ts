/**
 * Blog post input validation.
 *
 * Used by createPostAction and updatePostAction. Structured mostly like
 * the project schema — trim strings, coerce optional URLs, split
 * comma-separated tag / link input into arrays.
 */

import { z } from "zod";

/** Kebab-case slug: lowercase letters, digits, hyphens. Max 200. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Turn a title into a reasonable default slug. Also used client-side. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/** Split "a, b, c" into ["a", "b", "c"], trim + drop empties. */
export function splitCsv(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const BlogPostInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),

  subtitle: z
    .string()
    .trim()
    .max(500, "Subtitle must be 500 characters or fewer")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),

  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200, "Slug must be 200 characters or fewer")
    .regex(
      SLUG_REGEX,
      "Slug must be kebab-case: lowercase letters, digits, hyphens",
    ),

  bodyMarkdown: z.string().default(""),

  coverImageUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),

  // Arrays come in as raw strings (comma-separated) from the form; we
  // preprocess into arrays before running the rest of the pipeline.
  changeLinks: z.preprocess(
    splitCsv,
    z
      .array(z.string().url("Each change link must be a valid URL"))
      .max(10, "Max 10 change links"),
  ),

  tags: z.preprocess(
    splitCsv,
    z
      .array(
        z
          .string()
          .min(1)
          .max(50, "Tag must be 50 characters or fewer"),
      )
      .max(10, "Max 10 tags"),
  ),

  // Status comes from a hidden input; enforce narrow union.
  status: z.enum(["draft", "published"]).default("draft"),
});

export type BlogPostInput = z.infer<typeof BlogPostInputSchema>;

/**
 * Convert a parsed input into the shape our DB layer expects. Also holds
 * the "publishing must have a body" soft guard.
 */
export function toDbInput(input: BlogPostInput) {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    bodyMarkdown: input.bodyMarkdown,
    coverImageUrl: input.coverImageUrl,
    changeLinks: input.changeLinks,
    tags: input.tags,
    status: input.status,
  };
}

/**
 * Soft guard: publishing an empty body is almost always a mistake.
 * Called in the action layer to add a form-level error without blocking
 * the Zod parse.
 */
export function validatePublishReadiness(input: BlogPostInput): string | null {
  if (input.status === "published" && input.bodyMarkdown.trim().length < 100) {
    return "Body must be at least 100 characters before publishing.";
  }
  return null;
}
