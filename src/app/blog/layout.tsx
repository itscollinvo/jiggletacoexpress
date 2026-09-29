/**
 * Blog section layout. Its only job is to pull in our custom syntax
 * highlighting CSS so code blocks look right on /blog and /blog/[slug].
 * Scoping it to this layout (instead of the root) keeps the theme off
 * routes that don't render code — smaller CSS payload everywhere else.
 *
 * We ship our OWN highlight.js token styles (see hljs-theme.css) instead
 * of one of the stock github/atom/etc themes so code colors match the
 * site palette in both light and dark mode via CSS variables.
 */

import "./hljs-theme.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
