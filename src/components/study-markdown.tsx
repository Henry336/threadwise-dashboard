"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { markdownWithThreadwiseLinks } from "@/lib/study-markdown";
import { MarkdownImage, MermaidDiagram } from "./study-markdown-media";

export function StudyMarkdown({ source, onOpenNote }: { source: string; onOpenNote?: (target: string) => void }) {
  return <div className="study-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={(url) => url.startsWith("threadwise-note:") ? url : safeUrl(url)}
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

function safeUrl(value: string): string {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}
