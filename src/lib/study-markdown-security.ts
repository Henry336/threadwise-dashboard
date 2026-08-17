export type MarkdownImagePolicy = "same-origin" | "remote" | "blocked";

export function safeMarkdownLink(value: string): string {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

export function markdownImagePolicy(value: string, origin?: string): MarkdownImagePolicy {
  if (value.startsWith("//")) return "blocked";
  if (value.startsWith("/") && !value.startsWith("//")) return "same-origin";
  if (value.startsWith("blob:")) return "same-origin";
  if (value.startsWith("data:")) return "blocked";
  try {
    const url = new URL(value, origin);
    if (origin && url.origin === new URL(origin).origin) return "same-origin";
    return url.protocol === "https:" ? "remote" : "blocked";
  } catch {
    return "blocked";
  }
}
