export type MarkdownFileDraft = {
  title: string;
  body: string;
  tags: string[];
};

const WIKI_LINK = /(?<!\\)\[\[([^\]\n]{1,240})\]\]/gu;

export function normalizeMarkdownWikiTarget(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

export function markdownWithThreadwiseLinks(source: string): string {
  let fence: "`" | "~" | undefined;
  return source.split("\n").map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
    if (fenceMatch) {
      const marker = fenceMatch[0] as "`" | "~";
      if (!fence) fence = marker;
      else if (fence === marker) fence = undefined;
      return line;
    }
    if (fence) return line;
    return replaceOutsideInlineCode(line, (text) => text.replace(WIKI_LINK, (_match, raw: string) => {
      const separator = raw.indexOf("|");
      const target = (separator >= 0 ? raw.slice(0, separator) : raw).trim();
      const label = ((separator >= 0 ? raw.slice(separator + 1) : target).trim() || target)
        .replace(/([\\[\]])/gu, "\\$1");
      return `[${label}](threadwise-note:${encodeURIComponent(target)})`;
    }));
  }).join("\n");
}

function replaceOutsideInlineCode(line: string, replace: (value: string) => string): string {
  let result = "";
  let cursor = 0;
  for (const match of line.matchAll(/(`+)(.*?)\1/gu)) {
    const index = match.index ?? 0;
    result += replace(line.slice(cursor, index));
    result += match[0];
    cursor = index + match[0].length;
  }
  return result + replace(line.slice(cursor));
}

export function markdownExcerpt(source: string, limit = 260): string {
  const clean = source
    .replace(/```mermaid\s*[\s\S]*?```/giu, " Diagram. ")
    .replace(/```[^\n]*\n([\s\S]*?)```/gu, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(WIKI_LINK, (_match, raw: string) => raw.split("|").at(-1)?.trim() ?? raw)
    .replace(/^\s{0,3}#{1,6}\s+/gmu, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gmu, "")
    .replace(/^\s*[-*+]\s+/gmu, "")
    .replace(/[>*_~`|]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return clean.length > limit ? `${clean.slice(0, Math.max(0, limit - 1)).trimEnd()}…` : clean;
}

export function parseMarkdownFile(fileName: string, source: string): MarkdownFileDraft {
  const normalized = source.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n");
  let body = normalized;
  let frontmatter = "";
  if (normalized.startsWith("---\n")) {
    const end = normalized.indexOf("\n---\n", 4);
    if (end >= 0) {
      frontmatter = normalized.slice(4, end);
      body = normalized.slice(end + 5).trimStart();
    }
  }
  const values = new Map<string, string>();
  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    values.set(line.slice(0, separator).trim().toLocaleLowerCase("en"), unquoteYaml(line.slice(separator + 1).trim()));
  }
  const heading = body.match(/^#\s+(.+)$/mu)?.[1]?.trim();
  const fallbackTitle = fileName.replace(/\.md$/iu, "").replace(/[-_]+/gu, " ").trim() || "Imported note";
  return {
    title: values.get("title") || heading || fallbackTitle,
    body,
    tags: parseTags(values.get("tags") ?? ""),
  };
}

export function buildMarkdownExport(input: { title: string; body: string; tags: string[]; moduleCode: string; publicId?: string }): string {
  const metadata = [
    "---",
    `title: ${quoteYaml(input.title)}`,
    `module: ${quoteYaml(input.moduleCode)}`,
    ...(input.publicId ? [`threadwise_id: ${quoteYaml(input.publicId)}`] : []),
    `tags: [${input.tags.map(quoteYaml).join(", ")}]`,
    "---",
    "",
  ];
  return `${metadata.join("\n")}${input.body.trim()}\n`;
}

export function safeMarkdownFileName(title: string): string {
  const clean = title.normalize("NFKC").replace(/[<>:"/\\|?*\u0000-\u001F]/gu, " ").replace(/\s+/gu, " ").trim();
  return `${(clean || "Threadwise note").slice(0, 120)}.md`;
}

function parseTags(value: string): string[] {
  const list = value.replace(/^\[/u, "").replace(/\]$/u, "").split(",");
  return [...new Set(list.map((tag) => unquoteYaml(tag.trim()).replace(/^#/u, "").toLocaleLowerCase("en")).filter(Boolean))].slice(0, 20);
}

function quoteYaml(value: string): string {
  return `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`;
}

function unquoteYaml(value: string): string {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1).replace(/\\"/gu, '"').replace(/\\\\/gu, "\\");
  }
  return value;
}
