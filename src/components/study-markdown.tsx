"use client";

/**
 * Read-only Markdown renderer for Study and Personal notes (GFM, `++underline++`,
 * `[[wiki links]]`, Mermaid code blocks). Raw HTML is skipped and links pass through
 * `safeMarkdownLink`, so note content cannot inject scripts. Media lives in `study-markdown-media.tsx`.
 */
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { markdownWithThreadwiseLinks } from "@/lib/study-markdown";
import { safeMarkdownLink } from "@/lib/study-markdown-security";
import { MarkdownImage, MermaidDiagram } from "./study-markdown-media";

type MarkdownNode = { type?: string; value?: string; children?: MarkdownNode[]; data?: { hName?: string } };

/**
 * Small remark plugin that turns `++text++` into `<u>text</u>`. Standard Markdown has no
 * underline, so Threadwise uses this shorthand from its editor.
 */
function remarkUnderline() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" || !child.value?.includes("++")) {
          visit(child);
          return [child];
        }
        const parts: MarkdownNode[] = [];
        let cursor = 0;
        for (const match of child.value.matchAll(/\+\+([^+\n](?:.*?[^+])?)\+\+/gu)) {
          const index = match.index ?? 0;
          if (index > cursor) parts.push({ type: "text", value: child.value.slice(cursor, index) });
          parts.push({ type: "underline", data: { hName: "u" }, children: [{ type: "text", value: match[1] }] });
          cursor = index + match[0].length;
        }
        if (cursor < child.value.length) parts.push({ type: "text", value: child.value.slice(cursor) });
        return parts.length ? parts : [child];
      });
      node.children.forEach(visit);
    };
    visit(tree);
  };
}

/**
 * Renders one note. `threadwise-note:` links (from `[[wiki links]]`) become buttons that call
 * `onOpenNote`; other links open in a new tab. `mermaid` code blocks become diagrams,
 * images go through the consent-gated `MarkdownImage`, and task checkboxes are read-only.
 */
export function StudyMarkdown({ source, onOpenNote }: { source: string; onOpenNote?: (target: string) => void }) {
  return <div className="study-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkUnderline]}
      skipHtml
      urlTransform={(url) => url.startsWith("threadwise-note:") ? url : safeMarkdownLink(url)}
      components={{
        a: ({ href, children }) => {
          if (href?.startsWith("threadwise-note:")) {
            const target = decodeURIComponent(href.slice("threadwise-note:".length));
            return <button type="button" className="study-wiki-link" onClick={() => onOpenNote?.(target)}>{children}</button>;
          }
          return <a href={href} target="_blank" rel="noreferrer noopener">{children}<ExternalLink size={12} aria-hidden="true" /></a>;
        },
        pre: ({ children }) => {
          const child = Array.isArray(children) ? children[0] : children;
          if (isValidElement<{ className?: string; children?: ReactNode }>(child) && child.props.className === "language-mermaid") {
            return <MermaidDiagram source={String(child.props.children).replace(/\n$/u, "")} />;
          }
          return <pre>{children}</pre>;
        },
        code: ({ className, children, ...props }) => <code className={className} {...props}>{children}</code>,
        img: MarkdownImage,
        input: ({ type, checked, ...props }) => type === "checkbox"
          ? <input type="checkbox" checked={Boolean(checked)} readOnly aria-label={checked ? "Completed" : "Not completed"} />
          : <input type={type} {...props} />,
      }}
    >{markdownWithThreadwiseLinks(source)}</ReactMarkdown>
  </div>;
}
