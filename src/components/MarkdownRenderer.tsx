/**
 * Server-side markdown renderer for blog posts.
 *
 * Runs during RSC render (no client JS shipped for rendering itself). Uses:
 *   - remark-gfm    → GitHub-Flavored Markdown (tables, task lists, autolinks)
 *   - rehype-highlight → syntax-highlight fenced code blocks via highlight.js
 *
 * Why server-only:
 *   Markdown parsing + syntax highlighting is CPU-bound but bounded per post.
 *   Doing it on the server means:
 *     1. Zero JS shipped to the client for content that never changes on view
 *     2. The final HTML is search-engine + screen-reader friendly
 *     3. We control what tags/attrs get rendered (no dangerouslySetInnerHTML)
 *
 * Component overrides:
 *   - Anchor tags get target="_blank" + rel="noopener noreferrer" for
 *     external links so blog posts don't hijack the tab. Internal links
 *     (start with /) stay in-app.
 *   - Headings get scroll-margin so anchor jumps land below any sticky nav
 *     we might add later.
 *   - <img> becomes a plain <img> with lazy loading — Next.js's <Image>
 *     needs known dimensions and blog authors won't provide them.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { PrCard, parseGithubPr } from "./PrCard";

const isExternal = (href: string | undefined) =>
  !!href && !href.startsWith("/") && !href.startsWith("#");

const components: Components = {
  a: ({ href, children, ...props }) => {
    // Any github.com/*/pull/N link — inline autolinked bare URL or an
    // explicit `[text](url)` link — becomes a PrCard. This runs at RSC
    // render time, so no client JS is needed to swap the element.
    const pr = parseGithubPr(href);
    if (pr) return <PrCard {...pr} />;
    return isExternal(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-coral underline decoration-accent-coral/40 underline-offset-4 transition-colors hover:text-accent-hover"
        {...props}
      >
        {children}
      </a>
    ) : (
      <a
        href={href}
        className="text-accent-coral underline decoration-accent-coral/40 underline-offset-4 transition-colors hover:text-accent-hover"
        {...props}
      >
        {children}
      </a>
    );
  },
  h1: ({ children, ...props }) => (
    <h1
      className="mt-10 scroll-mt-20 text-3xl font-bold text-foreground"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-10 scroll-mt-20 text-2xl font-semibold text-foreground"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mt-8 scroll-mt-20 text-xl font-semibold text-foreground"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mt-5 leading-7 text-foreground/85" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mt-5 list-disc space-y-2 pl-6 text-foreground/85 marker:text-accent-gold"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mt-5 list-decimal space-y-2 pl-6 text-foreground/85 marker:text-accent-gold"
      {...props}
    >
      {children}
    </ol>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mt-6 border-l-4 border-accent-gold/50 bg-foreground/5 px-5 py-3 italic text-foreground/80"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    // Inline code (no language className) vs fenced code block (has hljs class
    // added by rehype-highlight). react-markdown v9 dropped the `inline` prop,
    // so we detect fenced blocks by the language class it emits.
    const isBlock = /^language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mt-6 overflow-x-auto rounded-2xl border border-border bg-foreground/5 p-5 text-sm leading-6"
      {...props}
    >
      {children}
    </pre>
  ),
  hr: () => <hr className="my-10 border-border" />,
  img: ({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      loading="lazy"
      className="mt-6 rounded-2xl border border-border"
      {...props}
    />
  ),
  table: ({ children, ...props }) => (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
      <table
        className="min-w-full divide-y divide-border text-left text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-2 font-semibold text-foreground/80"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2 text-foreground/80" {...props}>
      {children}
    </td>
  ),
};

interface Props {
  markdown: string;
}

export function MarkdownRenderer({ markdown }: Props) {
  return (
    <div className="text-foreground/85">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
