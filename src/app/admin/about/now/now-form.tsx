"use client";

import { useActionState } from "react";
import Link from "next/link";
import { upsertNowAction, type ActionResult } from "../actions";

interface Props {
  defaultContent?: string;
}

const initial: ActionResult = { ok: true };

export function NowForm({ defaultContent = "" }: Props) {
  const [state, action, isPending] = useActionState(upsertNowAction, initial);
  const formError = !state.ok ? state.formError : undefined;

  return (
    <form action={action} className="space-y-4">
      <textarea
        name="content"
        rows={16}
        defaultValue={defaultContent}
        placeholder="What you're building, reading, listening to, thinking about…"
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
      />
      {formError ? (
        <p className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/admin/about"
          className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
