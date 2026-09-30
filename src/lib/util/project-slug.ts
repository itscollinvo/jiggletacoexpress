/**
 * Utilities for project slugs — the URL segment used for /projects/[slug]
 * detail pages in R.3.
 *
 * Why "effective slug":
 *   Existing project rows predate the slug column, so their `slug` field
 *   is null. Rather than force a data migration up front, we let the app
 *   compute a fallback from the title so cards can still link somewhere
 *   the moment R.3 ships. As soon as the user saves a project through
 *   /admin/projects/[id]/edit, the server action stamps a real slug into
 *   the DB and this fallback stops mattering for that row.
 *
 * The fallback and the auto-generated slug both use the same slugify
 * function, so `/projects/{slugify(title)}` and `/projects/{db.slug}`
 * resolve to the same page for a freshly-migrated project.
 */

/**
 * Convert a title into a kebab-case URL slug. Lowercase, alphanumeric
 * only, hyphen-separated, trimmed. Identical to the blog's slugify.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Given a project row, return the slug to use in URLs. Prefers the DB
 * value; falls back to slugify(title) if the column is still null.
 */
export function getEffectiveSlug(project: {
  slug: string | null;
  title: string;
}): string {
  return project.slug ?? slugify(project.title);
}
