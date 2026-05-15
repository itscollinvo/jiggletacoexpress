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

  const parsed = ProjectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    githubUrl: formData.get("githubUrl"),
    imageUrl: formData.get("imageUrl"),
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

  const parsed = ProjectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    githubUrl: formData.get("githubUrl"),
    imageUrl: formData.get("imageUrl"),
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
