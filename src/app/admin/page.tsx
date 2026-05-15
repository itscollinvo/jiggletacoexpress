import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";

export default async function AdminDashboardPage() {
  const user = await requireCurrentUser();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-background/95 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
              Admin Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold text-foreground">
              Welcome back, {user.email}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/70">
              The private side of the site is live now. Auth is enforced before
              `/admin` renders, sessions refresh while you browse, and this is
              the base to build project CRUD, featured selections, and external
              integrations.
            </p>
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/projects"
            className="rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
              Projects
            </p>
            <h2 className="mt-3 text-xl font-semibold text-foreground">
              Manage showcase content
            </h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Inspect the database-backed project list now, then layer create,
              edit, feature, and image upload flows on top.
            </p>
          </Link>

          <Link
            href="/admin/security"
            className="rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
              Security
            </p>
            <h2 className="mt-3 text-xl font-semibold text-foreground">
              Two-factor authentication
            </h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">
              Enable or disable TOTP (Google Authenticator / Authy). Manage your
              authenticator and recovery options for the admin account.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
