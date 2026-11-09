"use client";

/**
 * Heavier note media split out of `study-markdown.tsx`: Mermaid diagrams and Markdown images.
 * Both are guarded: diagrams are size-checked, rendered locally and sanitized, and remote
 * images need one click of consent before the browser contacts another host.
 */
import DOMPurify from "dompurify";
import { AlertCircle, ImageOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { mermaidRenderConfiguration, validateMermaidSource, withTimeout } from "@/lib/study-mermaid";
import { markdownImagePolicy } from "@/lib/study-markdown-security";

/** Mermaid uses one global configuration, so renders run one at a time through this promise chain. */
let mermaidQueue: Promise<void> = Promise.resolve();

/** Runs `work` after every earlier render settles (pass or fail) and returns its result. */
function enqueueMermaid<T>(work: () => Promise<T>): Promise<T> {
  const result = mermaidQueue.then(work, work);
  mermaidQueue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Renders a Mermaid diagram from source. It checks the source against the size budget first,
 * waits until the figure is near the viewport, lazy-loads Mermaid, renders with a timeout
 * and sanitizes the SVG with DOMPurify before injecting it. Results for stale source are ignored.
 */
export function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const budget = validateMermaidSource(source);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<{ source: string; status: "idle" | "ready" | "error"; svg?: string }>({ source, status: "idle" });

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);

  useEffect(() => {
    if (!visible || !budget.valid) return;
    let active = true;
    void enqueueMermaid(async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize(mermaidRenderConfiguration(document.documentElement.dataset.theme === "dark" ? "dark" : "neutral"));
      const id = `threadwise-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/gu, "")}`;
      return withTimeout(mermaid.render(id, source));
    }).then((rendered) => {
      if (!active) return;
      const svg = DOMPurify.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
      setState({ source, status: "ready", svg });
    }).catch(() => {
      if (active) setState({ source, status: "error" });
    });
    return () => { active = false; };
  }, [budget.valid, reactId, source, visible]);

  if (!budget.valid) return <figure ref={rootRef} className="study-mermaid-state error"><AlertCircle size={20} /><figcaption>{budget.message}</figcaption></figure>;
  if (!visible) return <figure ref={rootRef} className="study-mermaid-state"><ShieldCheck size={20} /><figcaption>Diagram preview will load when it is visible.</figcaption></figure>;
  if (state.source !== source || state.status === "idle") return <figure ref={rootRef} className="study-mermaid-state"><LoaderCircle className="spin" size={20} /><figcaption>Drawing diagram…</figcaption></figure>;
  if (state.status === "error" || !state.svg) return <figure ref={rootRef} className="study-mermaid-state error"><AlertCircle size={20} /><figcaption>Mermaid could not render this bounded diagram. Check the syntax in Write mode.</figcaption></figure>;
  return <figure ref={rootRef} className="study-mermaid" dangerouslySetInnerHTML={{ __html: state.svg }} />;
}

/**
 * Image renderer for notes. Same-origin images show directly; other HTTPS images stay hidden
 * until the user clicks "Load this image", because loading them reveals the user's IP address.
 * Anything else is blocked. The policy is `markdownImagePolicy` in `src/lib/study-markdown-security.ts`.
 */
export function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  const value = typeof src === "string" ? src : "";
  const policy = markdownImagePolicy(value, typeof window === "undefined" ? undefined : window.location.origin);
  const [allowed, setAllowed] = useState(false);
  if (!value || policy === "blocked") return <span className="study-remote-image blocked"><ImageOff size={18} /><b>Image blocked</b><small>Only same-origin or explicitly approved HTTPS images can be shown.</small></span>;
  if (policy === "remote" && !allowed) {
    let host = "another site";
    try { host = new URL(value).hostname; } catch { /* Already classified as a URL. */ }
    return <span className="study-remote-image"><ShieldCheck size={18} /><b>Remote image hidden</b><small>Loading it will contact {host} and reveal your IP address.</small><button type="button" onClick={() => setAllowed(true)}>Load this image</button></span>;
  }
  // Same-origin images and remote images with one-time consent bypass Next Image's static host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={value} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" />;
}
