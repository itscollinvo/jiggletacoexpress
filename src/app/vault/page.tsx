/**
 * /vault — the public gate page.
 *
 * A minimal access-code entry form. Submits to /api/vault/unlock via POST.
 * No client-side JS needed — plain form + server redirect.
 *
 * If ?error=1 is present (set by the unlock route on bad code),
 * show a subtle error message.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";

export const metadata: Metadata = {
  title: "vault",
  // Exclude from search engine indexing — this is intentionally unlisted.
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function VaultGate({ searchParams }: Props) {
  // V.2 — Admin bypass. If the admin session cookie is set, skip the code
  // entry and go straight to /vault/home. The gate is still enforced for
  // everyone else (via the vault-session cookie set on /api/vault/unlock).
  const adminUser = await getCurrentUser();
  if (adminUser) {
    redirect("/vault/home");
  }

  const { error } = await searchParams;
  const hasError = error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            vault
          </h1>
          <p className="text-sm text-muted">
            this space is private. you know what to do.
          </p>
        </div>

        {/* Form — no action JS, just POST */}
        <form
          action="/api/vault/unlock"
          method="POST"
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            name="code"
            placeholder="access code"
            autoComplete="off"
            autoFocus
            required
            className="w-full rounded-md border border-border bg-foreground/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent-coral focus:outline-none"
          />

          {hasError && (
            <p className="text-xs text-accent-coral">
              that&apos;s not it.
            </p>
          )}

          <button
            type="submit"
            className="rounded-md border border-border bg-foreground/5 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-accent-coral hover:text-accent-coral"
          >
            enter
          </button>
        </form>
      </div>
    </div>
  );
}
