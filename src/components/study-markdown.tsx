"use client";

import DOMPurify from "dompurify";
import { isValidElement, useEffect, useId, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, ExternalLink, LoaderCircle } from "lucide-react";
import { markdownWithThreadwiseLinks } from "@/lib/study-markdown";

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

function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId();
  const [state, setState] = useState<{ source: string; status: "loading" | "ready" | "error"; svg?: string }>({ source, status: "loading" });

  useEffect(() => {
    let active = true;
    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "neutral",
        fontFamily: "inherit",
      });
      const id = `threadwise-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/gu, "")}`;
      const rendered = await mermaid.render(id, source);
      if (!active) return;
      const svg = DOMPurify.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
      setState({ source, status: "ready", svg });
    }).catch(() => {
      if (active) setState({ source, status: "error" });
    });
    return () => { active = false; };
  }, [reactId, source]);

  if (state.source !== source || state.status === "loading") return <figure className="study-mermaid-state"><LoaderCircle className="spin" size={20} /><figcaption>Drawing diagram…</figcaption></figure>;
  if (state.status === "error" || !state.svg) return <figure className="study-mermaid-state error"><AlertCircle size={20} /><figcaption>Mermaid could not render this diagram. Check the diagram syntax in Write mode.</figcaption></figure>;
  return <figure className="study-mermaid" dangerouslySetInnerHTML={{ __html: state.svg }} />;
}

function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  if (typeof src !== "string") return null;
  // Notes can reference arbitrary user-authored URLs, which cannot use Next Image's bounded host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" />;
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
