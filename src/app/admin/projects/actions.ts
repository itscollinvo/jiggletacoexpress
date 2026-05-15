"use server";

/**
 * Server Actions for project mutations.
 *
 * The `"use server"` directive at the top of the file marks every export as
 * a server action — callable from forms (`<form action={createProjectAction}>`)
 * or from client components (`onClick={() => deleteProjectAction(id)}`).
 *
 * Auth: every mutation calls requireCurrentUser(), which throws/redirects
 * if the request isn't from an authenticated admin. Actions on /admin pages
 * are also gated by the proxy, but defense in depth — never trust the proxy
 * alone for mutations.
 *
 * CSRF: Server Actions have built-in CSRF protection via Next.js's encoded
 * action IDs and same-origin checks. We don't add tokens manually.
 *
 * Cache invalidation: revalidatePath() tells Next.js the static cache for
 * the given route is stale. Since /admin/projects (and / and /projects) read
 * from the DB, those need to re-fetch after a mutation.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { put } from "@vercel/blob";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/db/queries/projects";
import {
  ProjectInputSchema,
  toDbInput,
} from "@/lib/validation/project";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * If the form contained an image file, upload it to Vercel Blob and
 * return the public URL. If not, return null. Throws on invalid file.
 *
 * Files are namespaced under `projects/` and given a timestamp prefix
 * so collisions are essentially impossible. `addRandomSuffix: true`
 * adds further uniqueness in case two uploads land in the same ms.
 */
async function maybeUploadImage(formData: FormData): Promise<string | null> {
  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      "Image must be PNG, JPEG, WebP, or GIF.",
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`projects/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

/**
 * Shape of the result we return to forms. Either:
 *   { ok: true } — success (paired with a redirect)
 *   { ok: false, fieldErrors, formError } — surfaced back to the form for display
 */
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

/* ----------------------------------------------------------------------------
 * Create
 * ------------------------------------------------------------------------- */
export async function createProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  // 1. Upload the image first (if any). If this fails, abort before
  //    touching the DB so we don't leave an orphan project row.
  let uploadedImageUrl: string | null = null;
  try {
    uploadedImageUrl = await maybeUploadImage(formData);
  } catch (err) {
    return {
      ok: false,
      fieldErrors: {
        imageFile: err instanceof Error ? err.message : "Image upload failed",
      },
    };
  }

  // 2. Validate the rest of the form. If a file was uploaded, prefer that
  //    URL over whatever was in the (legacy) imageUrl text input.
  const parsed = ProjectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    githubUrl: formData.get("githubUrl"),
    imageUrl: uploadedImageUrl ?? formData.get("imageUrl"),
    featured: formData.get("featured"),
    displayOrder: formData.get("displayOrder"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  try {
    await createProject(toDbInput(parsed.data));
  } catch (err) {
    return {
      ok: false,
      formError: err instanceof Error ? err.message : "Failed to create project",
    };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

/* ----------------------------------------------------------------------------
 * Update
 * ------------------------------------------------------------------------- */
export async function updateProjectAction(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, formError: "Invalid project id" };
  }

  // Same upload-first / DB-second pattern as create. If the user picked a
  // new file, upload it; otherwise the existing imageUrl text input value
  // (which the form preloads with the current value) wins.
  let uploadedImageUrl: string | null = null;
  try {
    uploadedImageUrl = await maybeUploadImage(formData);
  } catch (err) {
    return {
      ok: false,
      fieldErrors: {
        imageFile: err instanceof Error ? err.message : "Image upload failed",
      },
    };
  }

  const parsed = ProjectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    githubUrl: formData.get("githubUrl"),
    imageUrl: uploadedImageUrl ?? formData.get("imageUrl"),
    featured: formData.get("featured"),
    displayOrder: formData.get("displayOrder"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const result = await updateProject(id, toDbInput(parsed.data));
  if (!result) {
    return { ok: false, formError: "Project not found" };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

/* ----------------------------------------------------------------------------
 * Delete
 * ------------------------------------------------------------------------- */
export async function deleteProjectAction(formData: FormData) {
  await requireCurrentUser();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  await deleteProject(id);

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}
