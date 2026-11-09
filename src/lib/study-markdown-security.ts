/**
 * Link and image rules for rendered Markdown notes. Shared by the read-only renderer and the rich editor
 * so both apply the same limits.
 */
export type MarkdownImagePolicy = "same-origin" | "remote" | "blocked";

/** Returns the link if it is relative, an anchor, http(s) or mailto. Anything else (such as `javascript:`) becomes empty. */
export function safeMarkdownLink(value: string): string {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

/**
 * How a note image may load: same-origin and blob images load directly, remote https images wait for the
 * reader's consent, and everything else (data URLs, protocol-relative, http) is blocked.
 */
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
