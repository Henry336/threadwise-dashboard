"use client";

import { BookOpen, ExternalLink, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MERMAID_SYNTAX_SECTIONS, MERMAID_TEMPLATES } from "../lib/study-mermaid-templates";

export function StudyMermaidHelp({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (source: string) => void }) {
  const [query, setQuery] = useState("");
  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return MERMAID_TEMPLATES;
    return MERMAID_TEMPLATES.filter((template) => [template.name, template.family, template.description, ...template.tips, template.source].join(" ").toLowerCase().includes(needle));
  }, [query]);

  if (!open) return null;

  return <aside id="study-mermaid-help" className="study-mermaid-help" aria-label="Mermaid and UML syntax help">
    <header>
      <div><span><BookOpen size={14} /> Diagram guide</span><h3>Mermaid &amp; UML</h3></div>
      <button type="button" onClick={onClose} aria-label="Close diagram guide"><X size={18} /></button>
    </header>
    <div className="study-mermaid-help-body">
      <p className="study-mermaid-help-intro">Start with an example or use Threadwise easy syntax. Recognized shorthand previews immediately and becomes portable Mermaid when you finish; diagrams still render locally, and PlantUML or configuration directives remain unsupported.</p>
      <label className="study-mermaid-help-search">
        <Search size={15} />
        <span className="sr-only">Search diagram syntax</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search class, sequence, arrows…" />
      </label>
      <details className="study-mermaid-reference">
        <summary>Quick syntax reference <span>{MERMAID_SYNTAX_SECTIONS.reduce((count, section) => count + section.entries.length, 0)} examples</span></summary>
        <div>{MERMAID_SYNTAX_SECTIONS.map((section) => <section key={section.title}><h4>{section.title}</h4><dl>{section.entries.map((entry) => <div key={`${section.title}-${entry.syntax}`}><dt><code>{entry.syntax}</code></dt><dd>{entry.meaning}</dd></div>)}</dl></section>)}</div>
      </details>
      <div className="study-mermaid-template-list">
        {templates.map((template, index) => <details key={template.id} open={!query && index === 0}>
          <summary><span><b>{template.name}</b><small>{template.family} · {template.description}</small></span><i>View</i></summary>
          <div className="study-mermaid-template-body">
            <pre><code>{template.source}</code></pre>
            <ul>{template.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            <footer>
              <a href={template.docsUrl} target="_blank" rel="noreferrer">Full reference <ExternalLink size={13} /></a>
              <button type="button" onClick={() => onInsert(template.source)}>Insert example</button>
            </footer>
          </div>
        </details>)}
        {!templates.length && <p className="study-mermaid-help-empty">No matching example. Try “easy syntax”, “class”, “sequence”, “state”, or “planning”.</p>}
      </div>
      <p className="study-mermaid-help-footnote"><b>Portable by default:</b> Easy syntax is converted to standard Mermaid when you select Done or save the note. Tab and Shift+Tab still adjust selected diagram lines.</p>
    </div>
  </aside>;
}
