/**
 * Single project showcase card. Server component — no interactivity needed.
 *
 * Type comes from the DB schema (`Project = typeof projects.$inferSelect`),
 * so changes to the schema flow through to component props automatically.
 * If you rename a column, TypeScript will tell you exactly which JSX needs
 * to update.
 */

import Link from "next/link";
import { GithubIcon } from "./BrandIcons";
import type { Project } from "@/lib/db/schema";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-foreground/5 transition-colors hover:border-accent-coral">
      {project.imageUrl && (
        // Plain <img> is fine here — these are project thumbnails, not LCP images.
        // When we have real assets in /public, we can swap to next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.imageUrl}
          alt={project.title}
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-foreground transition-colors group-hover:text-accent-coral">
          {project.title}
        </h3>
        <p className="flex-1 text-sm text-muted">{project.description}</p>
        {project.githubUrl && (
          <Link
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent-gold transition-colors hover:text-accent-hover"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
          </Link>
        )}
      </div>
    </article>
  );
}
