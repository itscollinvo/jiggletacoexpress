import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { ProjectForm } from "../project-form";
import { createProjectAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          New project
        </p>
        <h1 className="text-3xl font-bold text-foreground">Add a project</h1>
        <p className="text-sm text-foreground/70">
          Fill out the fields below — it shows up on the public showcase as
          soon as you save.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <ProjectForm action={createProjectAction} submitLabel="Create project" />
      </div>

      <Link
        href="/admin/projects"
        className="mt-8 inline-block text-sm text-foreground/70 transition-colors hover:text-accent-hover"
      >
        ← Back to projects
      </Link>
    </div>
  );
}
