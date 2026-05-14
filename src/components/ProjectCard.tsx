/**
 * Single project showcase card. Server component — no interactivity needed.
 *
 * The Project type is defined here and re-exported, so it lives next to the
 * component that consumes it (avoids a separate types/ folder while we're small).
 */

import Link from "next/link";
import { GithubIcon } from "./BrandIcons";

export interface Project {
  title: string;
  description: string;
  github?: string;
  image?: string; // path under /public, e.g. "/projects/foo.png"
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-foreground/5 transition-colors hover:border-accent-coral">
      {project.image && (
        // Plain <img> is fine here — these are project thumbnails, not LCP images.
        // When you have real assets in /public, you can swap to next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.image}
          alt={project.title}
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-foreground transition-colors group-hover:text-accent-coral">
          {project.title}
        </h3>
        <p className="flex-1 text-sm text-muted">{project.description}</p>
        {project.github && (
          <Link
            href={project.github}
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
