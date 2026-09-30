/**
 * /about layout — pulls in the theme-matched syntax highlighting CSS
 * used by MarkdownRenderer (which renders the /now section's markdown).
 * Scoped here rather than the root layout to keep the CSS out of the
 * bundle on pages that don't render code.
 */

import "@/app/blog/hljs-theme.css";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
