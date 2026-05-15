import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { getSafeAdminRedirect } from "@/lib/auth/redirects";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-request": "Something was missing from the login form. Please try again.",
  "invalid-credentials": "That email or password did not match the admin account.",
  "rate-limited":
    "Too many login attempts from your network. Wait a few minutes and try again.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/admin");
  }

  const params = await searchParams;
  const next = getSafeAdminRedirect(params.next);
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background/95 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.08)]">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            Admin Access
          </p>
          <h1 className="text-3xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm leading-6 text-foreground/70">
            This route is reserved for your private dashboard and project
            controls. Use the seeded admin account to continue.
          </p>
        </div>

        <form action="/api/auth/login" method="post" className="mt-8 space-y-5">
          <input type="hidden" name="next" value={next} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-coral"
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
            Enter dashboard
          </button>
        </form>

        <div className="mt-8 border-t border-border pt-5">
          <Link
            href="/"
            className="text-sm text-foreground/70 transition-colors hover:text-accent-hover"
          >
            Back to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
