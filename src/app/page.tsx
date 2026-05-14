import Link from "next/link";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";
import { NowPlaying } from "@/components/NowPlaying";
import { ProjectCard } from "@/components/ProjectCard";
import { getAllProjects } from "@/lib/db/queries/projects";

// Render this page at request time (not build time). Without this, `next build`
// would try to pre-render the page into static HTML and fail in CI because the
// build environment has no DATABASE_URL. In production on Vercel the page is
// still fast (server functions are warm and cached at the edge by default).
export const dynamic = "force-dynamic";

// `async` is allowed on Server Components — the function runs on the server,
// awaits any data, and the result is rendered into the HTML before reaching
// the browser. No useEffect, no loading states, no hydration data fetching.
export default async function Home() {
  const projects = await getAllProjects();

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 lg:px-12 lg:pt-16">
      {/* Hero */}
      <section className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          I am <span className="text-accent-coral">jiggletaco</span>, I like to
          make life simple{" "}
          <span className="text-accent-gold">&amp;</span> enjoyable :)
        </h1>

        <NowPlaying />

        <p className="text-lg text-foreground/80">Welcome to my domain.</p>
      </section>

      {/* Professional intro */}
      <section className="mt-12 flex flex-col gap-4">
        <p className="text-base leading-relaxed text-foreground/90">
          I am currently a CS student at{" "}
          <span className="text-accent-gold">
            Stevens Institute of Technology
          </span>{" "}
          and a soon-to-be Software Engineer, passionate about building
          full-stack applications, machine learning, and engineering personal
          solutions.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="https://linkedin.com/in/collinvo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            <LinkedinIcon className="h-4 w-4" />
            LinkedIn
          </Link>
          <Link
            href="mailto:collinvo26@gmail.com"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            <Mail className="h-4 w-4" />
            Email
          </Link>
          <Link
            href="https://github.com/itscollinvo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-accent-coral hover:text-accent-hover"
          >
            <GithubIcon className="h-4 w-4" />
            GitHub
          </Link>
        </div>
      </section>

      {/* Casual about */}
      <section className="mt-12">
        <p className="text-base leading-relaxed text-foreground/80">
          All else: let&apos;s keep this brief and casual. I guess this is where
          I tell you a bit about myself. Well, I like to climb cool rocks (feel
          free to reach out to climb), I will definitely try out every piano I
          spot, and I enjoy nature.
        </p>
      </section>

      {/* Project showcase */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
