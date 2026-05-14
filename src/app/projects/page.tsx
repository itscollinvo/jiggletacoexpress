import { ProjectCard } from "@/components/ProjectCard";
import { getAllProjects } from "@/lib/db/queries/projects";

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      <h1 className="text-4xl font-bold text-foreground">Projects</h1>
      <p className="mt-3 text-foreground/70">
        Things I&apos;m building or have built.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
