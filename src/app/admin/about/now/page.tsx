import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getNow } from "@/lib/db/queries/about";
import { NowForm } from "./now-form";

export const dynamic = "force-dynamic";

export default async function AdminNowPage() {
  await requireCurrentUser();
  const row = await getNow();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          About / Now
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          What you&apos;re up to
        </h1>
        <p className="text-sm text-foreground/70">
          Markdown. Goes at the top of /about. Update whenever your focus
          shifts. Last updated{" "}
          {row?.updatedAt
            ? row.updatedAt.toLocaleDateString()
            : "never"}
          .
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <NowForm defaultContent={row?.content ?? ""} />
      </div>

      <Link
        href="/admin/about"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back to About admin
      </Link>
    </div>
  );
}
