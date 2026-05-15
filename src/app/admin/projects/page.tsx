import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/auth";
import { getAllProjects } from "@/lib/db/queries/projects";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requireCurrentUser();
  const projects = await getAllProjects();

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-gold">
            Admin Projects
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            Database-backed project inventory
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            This is the first protected management view. It confirms the admin
            session and reads the same project records powering the public site.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-2xl border border-border px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-accent-coral hover:text-accent-hover"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-border">
        <table className="min-w-full divide-y divide-border text-left">
          <thead className="bg-foreground/3">
            <tr className="text-xs uppercase tracking-[0.2em] text-foreground/60">
              <th className="px-5 py-4 font-medium">Project</th>
              <th className="px-5 py-4 font-medium">Order</th>
              <th className="px-5 py-4 font-medium">Featured</th>
              <th className="px-5 py-4 font-medium">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {projects.map((project) => (
              <tr key={project.id} className="align-top">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{project.title}</p>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-foreground/70">
                    {project.description}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm text-foreground/80">
                  {project.displayOrder}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      project.featured
                        ? "bg-accent-gold/15 text-accent-gold"
                        : "bg-foreground/6 text-foreground/60"
                    }`}
                  >
                    {project.featured ? "Featured" : "Hidden from hero"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  {project.githubUrl ? (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-coral transition-colors hover:text-accent-hover"
                    >
                      View repo
                    </a>
                  ) : (
                    <span className="text-foreground/50">No GitHub URL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
