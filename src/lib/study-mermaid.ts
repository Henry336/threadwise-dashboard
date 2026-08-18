export const MERMAID_MAX_CHARACTERS = 12_000;
export const MERMAID_MAX_LINES = 240;
export const MERMAID_MAX_STATEMENTS = 400;
export const MERMAID_RENDER_TIMEOUT_MS = 4_000;

export type MermaidBudget = { valid: true } | { valid: false; message: string };

export function validateMermaidSource(source: string): MermaidBudget {
  if (source.length > MERMAID_MAX_CHARACTERS) return { valid: false, message: "This Mermaid diagram is too large to preview safely." };
  const lines = source.split(/\r?\n/u);
  if (lines.length > MERMAID_MAX_LINES) return { valid: false, message: "This Mermaid diagram has too many lines to preview safely." };
  if (lines.some((line) => line.trimStart().startsWith("%%{"))) return { valid: false, message: "Mermaid configuration directives are not supported in notes." };
  const statements = source.split(/\r?\n|;/u).filter((line) => line.trim() && !line.trimStart().startsWith("%%")).length;
  if (statements > MERMAID_MAX_STATEMENTS) return { valid: false, message: "This Mermaid diagram is too complex to preview safely." };
  return { valid: true };
}
export function withTimeout<T>(promise: Promise<T>, timeoutMs = MERMAID_RENDER_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Mermaid render timed out")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}
