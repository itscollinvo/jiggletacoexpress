/**
 * Layout for /projects/[slug] — pulls in our theme-matched syntax
 * highlighting CSS so code fences in the case-study body render with
 * the site palette. Same file the blog layout imports; Next/Turbopack
 * dedupes shared CSS across route segments so we don't pay for it
 * twice at runtime.
 *
 * Scoped to /projects/[slug]/ specifically (not /projects/) because
 * the projects INDEX page doesn't render markdown — no need to load
 * highlighting CSS there.
 */

import "@/app/blog/hljs-theme.css";

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
