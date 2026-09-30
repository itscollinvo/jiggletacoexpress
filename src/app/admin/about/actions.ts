"use server";

/**
 * Server actions for the /about admin surface. Handles three resources:
 *   - /now content (single upsert)
 *   - timeline entries (create/update/delete)
 *   - hobby photos (create/delete)
 *
 * Each mutating action calls requireCurrentUser() first — defense in depth
 * even though the /admin proxy already gates the route.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/auth";
import {
  upsertNow,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  createAboutPhoto,
  deleteAboutPhoto,
} from "@/lib/db/queries/about";
import {
  NowInputSchema,
  TimelineEntryInputSchema,
  timelineToDbInput,
  AboutPhotoInputSchema,
  photoToDbInput,
} from "@/lib/validation/about";

/** Consistent success/error shape for useActionState consumers. */
export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

function flattenZodErrors(
  error: import("zod").ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Revalidate the public + admin about surfaces after any mutation. */
function revalidateAboutPaths() {
  revalidatePath("/about");
  revalidatePath("/admin/about");
  revalidatePath("/admin/about/now");
  revalidatePath("/admin/about/timeline");
  revalidatePath("/admin/about/photos");
}

/* ----- /now ----- */

export async function upsertNowAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  const parsed = NowInputSchema.safeParse({
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  try {
    await upsertNow(parsed.data.content);
  } catch (err) {
    return {
      ok: false,
      formError: err instanceof Error ? err.message : "Failed to save",
    };
  }
  revalidateAboutPaths();
  return { ok: true };
}

/* ----- timeline entries ----- */

export async function createTimelineEntryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  const parsed = TimelineEntryInputSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  try {
    await createTimelineEntry(timelineToDbInput(parsed.data));
  } catch (err) {
    return {
      ok: false,
      formError:
        err instanceof Error ? err.message : "Failed to create entry",
    };
  }
  revalidateAboutPaths();
  redirect("/admin/about/timeline");
}

export async function updateTimelineEntryAction(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  const parsed = TimelineEntryInputSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  const result = await updateTimelineEntry(id, timelineToDbInput(parsed.data));
  if (!result) return { ok: false, formError: "Entry not found" };

  revalidateAboutPaths();
  redirect("/admin/about/timeline");
}

export async function deleteTimelineEntryAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteTimelineEntry(id);
  revalidateAboutPaths();
}

/* ----- photos ----- */

export async function createAboutPhotoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireCurrentUser();

  const parsed = AboutPhotoInputSchema.safeParse({
    url: formData.get("url"),
    caption: formData.get("caption"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenZodErrors(parsed.error) };
  }

  try {
    await createAboutPhoto(photoToDbInput(parsed.data));
  } catch (err) {
    return {
      ok: false,
      formError:
        err instanceof Error ? err.message : "Failed to save photo",
    };
  }
  revalidateAboutPaths();
  return { ok: true };
}

export async function deleteAboutPhotoAction(formData: FormData) {
  await requireCurrentUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteAboutPhoto(id);
  revalidateAboutPaths();
}
