"use client";

import DOMPurify from "dompurify";
import { AlertCircle, ImageOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { validateMermaidSource, withTimeout } from "@/lib/study-mermaid";
import { markdownImagePolicy } from "@/lib/study-markdown-security";

let mermaidQueue: Promise<void> = Promise.resolve();

function enqueueMermaid<T>(work: () => Promise<T>): Promise<T> {
  const result = mermaidQueue.then(work, work);
  mermaidQueue = result.then(() => undefined, () => undefined);
  return result;
}

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
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "neutral",
        fontFamily: "inherit",
      });
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
