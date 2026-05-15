"use client";

/**
 * Shared create/edit form. Used by both /admin/projects/new and
 * /admin/projects/[id]/edit. The parent passes which server action to call.
 *
 * useActionState (React 19) wires the action result back into client state
 * so we can render field-level error messages without managing useState
 * for every field. The hook returns:
 *   - state: the latest result the server action returned (or our initial)
 *   - formAction: a thin wrapper to attach to <form action={...}>
 *   - isPending: true while the action is in flight
 */

import { useActionState } from "react";
import Link from "next/link";
import type { ActionResult } from "./actions";

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

interface Props {
  action: FormAction;
  /** Existing project values (for edit mode); empty/defaults for create. */
  defaults?: {
    title?: string;
    description?: string;
    githubUrl?: string | null;
    imageUrl?: string | null;
    featured?: boolean;
    displayOrder?: number;
  };
  /** Button label — "Create project" vs "Save changes". */
  submitLabel: string;
}

const initialState: ActionResult = { ok: true };

export function ProjectForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const fieldErrors = !state.ok ? state.fieldErrors : undefined;
  const formError = !state.ok ? state.formError : undefined;

  return (
    // encType="multipart/form-data" is REQUIRED to send files in a form
    // submission. Without it, the file input's value is sent as just a name
    // string, not the actual binary contents.
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      {/* Title */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Title</span>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.title ? (
          <span className="text-xs text-accent-coral">{fieldErrors.title}</span>
        ) : null}
      </label>

      {/* Description */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Description</span>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.description ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.description}
          </span>
        ) : null}
      </label>

      {/* GitHub URL */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          GitHub URL <span className="text-foreground/50">(optional)</span>
        </span>
        <input
          type="url"
          name="githubUrl"
          defaultValue={defaults?.githubUrl ?? ""}
          placeholder="https://github.com/itscollinvo/your-repo"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.githubUrl ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.githubUrl}
          </span>
        ) : null}
      </label>

      {/* Image — file upload OR URL fallback.
       *
       * Two ways to provide an image:
       *   1. Pick a file → server uploads to Vercel Blob, returns a URL,
       *      that URL is stored as the project's imageUrl.
       *   2. Paste an external URL into the URL field — used as-is.
       *
       * If both are provided, the uploaded file wins (see actions.ts).
       * Existing image (if any) shows as a preview with the current URL
       * pre-filled in the URL field, so saving without picking a new
       * file leaves the image unchanged. */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-foreground">
          Image <span className="text-foreground/50">(optional)</span>
        </span>

        {defaults?.imageUrl ? (
          <div className="rounded-2xl border border-border bg-foreground/5 p-3">
            <p className="mb-2 text-xs text-foreground/60">Current image:</p>
            {/* Plain img — these are admin previews, not LCP. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaults.imageUrl}
              alt="Current project image"
              className="aspect-video w-full max-w-md rounded-xl object-cover"
            />
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-xs text-foreground/70">
            Upload a new image (PNG / JPEG / WebP / GIF, max 5MB)
          </span>
          <input
            type="file"
            name="imageFile"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-xl file:border-0 file:bg-accent-coral file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-accent-hover"
          />
          {fieldErrors?.imageFile ? (
            <span className="text-xs text-accent-coral">
              {fieldErrors.imageFile}
            </span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-xs text-foreground/70">
            …or paste an external URL
          </span>
          <input
            type="url"
            name="imageUrl"
            defaultValue={defaults?.imageUrl ?? ""}
            placeholder="https://..."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          {fieldErrors?.imageUrl ? (
            <span className="text-xs text-accent-coral">
              {fieldErrors.imageUrl}
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Display order */}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Display order
          </span>
          <input
            type="number"
            name="displayOrder"
            min={0}
            step={1}
            defaultValue={defaults?.displayOrder ?? 0}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          <span className="text-xs text-foreground/60">
            Lower numbers appear first.
          </span>
          {fieldErrors?.displayOrder ? (
            <span className="block text-xs text-accent-coral">
              {fieldErrors.displayOrder}
            </span>
          ) : null}
        </label>

        {/* Featured */}
        <label className="flex cursor-pointer items-center gap-3 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            value="true"
            defaultChecked={defaults?.featured ?? false}
            className="h-4 w-4 accent-accent-coral"
          />
          <span className="text-foreground">Show on front-page hero</span>
        </label>
      </div>

      {formError ? (
        <p className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {formError}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/projects"
          className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
