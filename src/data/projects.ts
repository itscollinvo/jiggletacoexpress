/**
 * Hardcoded project data for Phase 1.
 *
 * In Phase 2 this gets replaced by a query to your Postgres `projects` table,
 * managed via the /admin/projects UI. For now, edit this file and push to
 * update the showcase.
 */

import type { Project } from "@/components/ProjectCard";

export const projects: Project[] = [
  {
    title: "jiggletaco.com",
    description:
      "This site! Next.js + TypeScript + Tailwind, deployed on Vercel with custom auth and a handful of API integrations to come.",
    github: "https://github.com/itscollinvo/jiggletacoexpress",
  },
  {
    title: "Airbnb Price Predictor",
    description:
      "ML model that estimates listing prices from features. Trained on the NYC 2019 dataset, served via a Python API.",
    github: "https://github.com/itscollinvo/Airbnb-Price-Predictor",
  },
  {
    title: "More projects coming…",
    description:
      "Currently planning: Claude Projects integration, a Spotify now-playing widget, and an Obsidian-vault-backed ideas page.",
  },
];
