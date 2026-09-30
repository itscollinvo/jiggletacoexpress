"use client";

/**
 * Client-side markdown preview used only in the admin editor.
 *
 * Why a separate preview component (vs re-using MarkdownRenderer):
 *   MarkdownRenderer is a server component and pulls in rehype-highlight
 *   plus highlight.js — ~50KB gzipped. Loading that in the client editor
 *   bundle would hurt page weight for a admin-only route. The preview
 *   here skips syntax highlighting; code blocks render as plain monospace.
 *   That's close enough for drafting — full fidelity happens on the public
 *   page after publish.
 *
 * Component styling mirrors the public renderer as closely as reasonable
 * so the preview isn't misleading. If you tweak MarkdownRenderer.tsx,
 * mirror the changes here.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { PrCard, parseGithubPr } from "@/components/PrCard";

const isExternal = (href: string | undefined) =>
  !!href && !href.startsWith("/") && !href.startsWith("#");

const components: Components = {
  a: ({ href, children, ...props }) => {
    // Match the public renderer's behavior: github.com/*/pull/N links
    // become PrCards in the preview too, so what the author sees while
    // drafting matches what visitors will see.
    const pr = parseGithubPr(href);
    if (pr) return <PrCard {...pr} />;
    return (
      <a
        href={href}
        target={isExternal(href) ? "_blank" : undefined}
        rel={isExternal(href) ? "noopener noreferrer" : undefined}
        className="text-accent-coral underline decoration-accent-coral/40 underline-offset-4"
        {...props}
      >
        {children}
      </a>
    );
  },
  h1: ({ children }) => (
    <h1 className="mt-8 text-2xl font-bold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-xl font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children, node }) => {
    // Same unwrap-for-PR-embed logic as MarkdownRenderer — see comment
    // there. Keeping the preview aligned with the public renderer so
    // authors see hydration-safe output while drafting.
    const kids = node?.children ?? [];
    const meaningful = kids.filter(
      (c) => !(c.type === "text" && /^\s*$/.test(c.value)),
    );
    const onlyChild = meaningful.length === 1 ? meaningful[0] : null;
    if (
      onlyChild &&
      onlyChild.type === "element" &&
      onlyChild.tagName === "a" &&
      typeof onlyChild.properties?.href === "string" &&
      parseGithubPr(onlyChild.properties.href)
    ) {
      return <>{children}</>;
    }
    return <p className="mt-4 leading-6 text-foreground/85">{children}</p>;
  },
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-1 pl-6 text-foreground/85 marker:text-accent-gold">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1 pl-6 text-foreground/85 marker:text-accent-gold">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-accent-gold/50 bg-foreground/5 px-4 py-2 italic text-foreground/80">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
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
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-foreground/5 p-4 text-sm leading-6">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      loading="lazy"
      className="mt-4 rounded-2xl border border-border"
    />
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 font-semibold text-foreground/80">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-foreground/80">{children}</td>
  ),
};

interface Props {
  markdown: string;
}

export function MarkdownPreview({ markdown }: Props) {
  if (!markdown.trim()) {
    return (
      <p className="text-sm italic text-foreground/50">
        Preview appears here as you type.
      </p>
    );
  }
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
