import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-10 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Admin / About
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Manage About page
        </h1>
        <p className="text-sm text-foreground/70">
          The public /about page pulls from three DB-backed surfaces.
          Everything else on that page (hero, narrative, values) lives
          in the source code — edit those in /src/app/about/page.tsx.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/about/now"
          className="rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
            Now
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            What I&apos;m up to
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            The rolling snapshot at the top of /about. Markdown. One row.
          </p>
        </Link>

        <Link
          href="/admin/about/timeline"
          className="rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
            Timeline
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            Milestones
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Year-by-year entries. High school through now. Add, edit, reorder.
          </p>
        </Link>

        <Link
          href="/admin/about/photos"
          className="rounded-3xl border border-border p-6 transition-colors hover:border-accent-coral hover:bg-foreground/3"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-accent-gold">
            Photos
          </p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            Hobbies gallery
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Grid of personal photos (climbing, piano, whatever). Upload
            here, they render at the bottom of /about.
          </p>
        </Link>
      </div>

      <Link
        href="/admin"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
