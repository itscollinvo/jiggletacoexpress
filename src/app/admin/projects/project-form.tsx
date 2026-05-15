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
    <form action={formAction} className="space-y-6">
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

      {/* Image URL — replaced with file picker in 2d.3 */}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Image URL{" "}
          <span className="text-foreground/50">
            (optional, will become an upload in a later iteration)
          </span>
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
