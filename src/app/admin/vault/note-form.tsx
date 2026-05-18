"use client";

import { useActionState } from "react";
import { createVaultNoteAction, type VaultActionResult } from "./actions";

export function NoteForm() {
  const [state, action, pending] = useActionState<VaultActionResult | null, FormData>(
    createVaultNoteAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Filename (slug)</label>
        <input
          type="text"
          name="slug"
          placeholder="scattered-thoughts"
          required
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
        />
        <span className="text-xs text-muted">.md is added automatically</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Content</label>
        <textarea
          name="content"
          rows={5}
          placeholder="still figuring things out.&#10;that's okay."
          required
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none resize-y font-mono"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Display date (optional)</label>
        <input
          type="text"
          name="displayDate"
          placeholder="2026-03-12"
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
        />
      </div>

      {state && !state.ok && (
        <p className="text-xs text-accent-coral">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-muted">saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-border bg-foreground/5 px-4 py-2 text-sm text-foreground transition-colors hover:border-accent-coral disabled:opacity-50"
      >
        {pending ? "saving..." : "save note"}
      </button>
    </form>
  );
}
