"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionResult } from "../actions";

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

interface Props {
  action: FormAction;
  defaults?: {
    year?: string;
    title?: string;
    description?: string;
    icon?: string | null;
    sortOrder?: number;
  };
  submitLabel: string;
}

const initial: ActionResult = { ok: true };

export function TimelineForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, initial);
  const fieldErrors = !state.ok ? state.fieldErrors : undefined;
  const formError = !state.ok ? state.formError : undefined;

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Year <span className="text-foreground/50">(freeform)</span>
          </span>
          <input
            name="year"
            required
            defaultValue={defaults?.year ?? ""}
            placeholder="2024, Summer 2023, Present…"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          {fieldErrors?.year ? (
            <span className="text-xs text-accent-coral">
              {fieldErrors.year}
            </span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Sort order
          </span>
          <input
            type="number"
            name="sortOrder"
            step={1}
            defaultValue={defaults?.sortOrder ?? 0}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
          />
          <span className="text-xs text-foreground/60">
            Lower numbers render first. Negative numbers OK (put &ldquo;Present&rdquo;
            at -1 to top the list).
          </span>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Title</span>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          placeholder="Started at Stevens Institute"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        {fieldErrors?.title ? (
          <span className="text-xs text-accent-coral">
            {fieldErrors.title}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Description{" "}
          <span className="text-foreground/50">(one to two sentences)</span>
        </span>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Icon{" "}
          <span className="text-foreground/50">
            (optional — a lucide-react name, e.g. GraduationCap, Code, Briefcase)
          </span>
        </span>
        <input
          name="icon"
          defaultValue={defaults?.icon ?? ""}
          placeholder="GraduationCap"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
        />
        <span className="text-xs text-foreground/60">
          Names from lucide.dev. Falls back to a dot if left blank or if
          the name isn&apos;t recognized.
        </span>
      </label>

      {formError ? (
        <p className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/about/timeline"
          className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
