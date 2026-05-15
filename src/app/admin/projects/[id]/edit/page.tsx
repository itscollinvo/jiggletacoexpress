import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getProjectById } from "@/lib/db/queries/projects";
import { ProjectForm } from "../../project-form";
import { updateProjectAction } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: PageProps) {
  await requireCurrentUser();

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  // Bind the project id to the action so the form only needs (prev, formData).
  // `.bind(null, id)` partially applies the first argument; the form action
  // signature becomes (prev, formData) which matches what ProjectForm expects.
  const boundAction = updateProjectAction.bind(null, id);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
          Edit project
        </p>
        <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
        <p className="text-sm text-foreground/70">
          Changes go live as soon as you save.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background/95 p-8">
        <ProjectForm
          action={boundAction}
          submitLabel="Save changes"
          defaults={{
            title: project.title,
            description: project.description,
            githubUrl: project.githubUrl,
            imageUrl: project.imageUrl,
            featured: project.featured,
            displayOrder: project.displayOrder,
          }}
        />
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
