"use server";

/**
 * Server Actions for blog post mutations. Mirrors the projects/actions.ts
 * pattern — Zod validation, admin auth guard, revalidate the affected
 * paths on success.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  createPost,
  deletePost,
  slugTaken,
  togglePublish,
  updatePost,
} from "@/lib/db/queries/blog";
import {
  BlogPostInputSchema,
  toDbInput,
  validatePublishReadiness,
} from "@/lib/validation/blog";

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Partial<Record<string, string>>;
    };

function flattenZodErrors(err: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path[0];
    if (typeof path === "string" && !fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

/** Revalidate all routes that show blog content. */
function revalidateBlogPaths() {
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  // Also revalidate the front page in case blog previews land there later.
  revalidatePath("/");
}

/* ----------------------------------------------------------------------------
 * Create
 * ------------------------------------------------------------------------- */
export async function createPostAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  const parsed = BlogPostInputSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    slug: formData.get("slug"),
    bodyMarkdown: formData.get("bodyMarkdown"),
    coverImageUrl: formData.get("coverImageUrl"),
    changeLinks: formData.get("changeLinks"),
    tags: formData.get("tags"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const publishError = validatePublishReadiness(parsed.data);
  if (publishError) {
    return { ok: false, formError: publishError };
  }

  if (await slugTaken(parsed.data.slug)) {
    return { ok: false, fieldErrors: { slug: "That slug is already used." } };
  }

  let createdId: number;
  try {
    const created = await createPost(toDbInput(parsed.data));
    createdId = created.id;
  } catch (err) {
    return {
      ok: false,
      formError: err instanceof Error ? err.message : "Failed to create post",
    };
  }

  revalidateBlogPaths();
  // Redirect straight into the edit view so you can keep iterating without
  // an extra click. Save-as-draft workflow assumes you'll be editing more.
  redirect(`/admin/blog/${createdId}/edit`);
}

/* ----------------------------------------------------------------------------
 * Update
 * ------------------------------------------------------------------------- */
export async function updatePostAction(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, formError: "Invalid post id" };
  }

  const parsed = BlogPostInputSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    slug: formData.get("slug"),
    bodyMarkdown: formData.get("bodyMarkdown"),
    coverImageUrl: formData.get("coverImageUrl"),
    changeLinks: formData.get("changeLinks"),
    tags: formData.get("tags"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const publishError = validatePublishReadiness(parsed.data);
  if (publishError) {
    return { ok: false, formError: publishError };
  }

  if (await slugTaken(parsed.data.slug, id)) {
    return { ok: false, fieldErrors: { slug: "That slug is already used." } };
  }

  const result = await updatePost(id, toDbInput(parsed.data));
  if (!result) {
    return { ok: false, formError: "Post not found" };
  }

  revalidateBlogPaths();
  // Stay on the edit page so you can save + keep tweaking.
  redirect(`/admin/blog/${id}/edit?saved=1`);
}

/* ----------------------------------------------------------------------------
 * Delete
 * ------------------------------------------------------------------------- */
export async function deletePostAction(formData: FormData) {
  await requireCurrentUser();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await deletePost(id);
  revalidateBlogPaths();
}

/* ----------------------------------------------------------------------------
 * Toggle publish (list-view quick action, added in Phase B.4)
 * ------------------------------------------------------------------------- */
export async function togglePublishAction(formData: FormData) {
  await requireCurrentUser();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await togglePublish(id);
  revalidateBlogPaths();
}
