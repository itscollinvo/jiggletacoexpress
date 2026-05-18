"use client";

import { useActionState } from "react";
import { createVaultJournalAction, type VaultActionResult } from "./actions";

export function JournalForm() {
  const [state, action, pending] = useActionState<VaultActionResult | null, FormData>(
    createVaultJournalAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Entry date</label>
        <input
          type="text"
          name="entryDate"
          placeholder="2026-01-15"
          required
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
        />
        <span className="text-xs text-muted">also used as the terminal filename (e.g. 2026-01-15.md)</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Content</label>
        <textarea
          name="content"
          rows={6}
          placeholder="started this. not sure where it goes.&#10;that's the point."
          required
          className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none resize-y font-mono"
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
        {pending ? "saving..." : "save entry"}
      </button>
    </form>
  );
}
