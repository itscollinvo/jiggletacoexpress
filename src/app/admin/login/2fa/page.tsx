import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  PENDING_COOKIE_NAME,
  verifyPendingSession,
} from "@/lib/auth/session";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-request":
    "Missing code. Please enter the 6-digit code from your authenticator app.",
  "invalid-code":
    "That code didn't match. Try again with the current code in your app.",
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function TwoFactorLoginPage({ searchParams }: PageProps) {
  // Belt-and-suspenders check (proxy already enforces this, but reading the
  // cookie here lets us redirect with the right destination if needed).
  const cookieStore = await cookies();
  const pendingToken = cookieStore.get(PENDING_COOKIE_NAME)?.value;
  const pending = await verifyPendingSession(pendingToken);

  if (!pending) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const next = getSafeAdminRedirect(params.next);
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background/95 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.08)]">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            Two-Factor Authentication
          </p>
          <h1 className="text-3xl font-bold text-foreground">Enter your code</h1>
          <p className="text-sm leading-6 text-foreground/70">
            Open your authenticator app and enter the 6-digit code for
            jiggletaco.
          </p>
        </div>

        <form
          action="/api/auth/2fa/verify"
          method="post"
          className="mt-8 space-y-5"
        >
          <input type="hidden" name="next" value={next} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              6-digit code
            </span>
            <input
              type="text"
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none transition-colors focus:border-accent-coral"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-accent-coral px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Verify
          </button>
        </form>

        <div className="mt-8 border-t border-border pt-5">
          <Link
            href="/admin/login"
            className="text-sm text-foreground/70 transition-colors hover:text-accent-hover"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
