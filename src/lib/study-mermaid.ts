export const MERMAID_MAX_CHARACTERS = 12_000;
export const MERMAID_MAX_LINES = 240;
export const MERMAID_MAX_STATEMENTS = 400;
export const MERMAID_RENDER_TIMEOUT_MS = 4_000;

export type MermaidBudget = { valid: true } | { valid: false; message: string };
export type MermaidDiagramKind = "flowchart" | "class" | "sequence" | "state" | "other";
export type MermaidLayout = "vertical" | "horizontal";
export type MermaidLayoutChoice = MermaidLayout | "default";
export type MermaidAliasIssue = { line: number; message: string };
export type NormalizedMermaidSource = { source: string; changed: boolean; issues: MermaidAliasIssue[] };

const IDENTIFIER = "[A-Za-z_][A-Za-z0-9_]*";
const VISIBILITY = { public: "+", private: "-", protected: "#", package: "~" } as const;

export function mermaidRenderConfiguration(theme: "dark" | "neutral") {
  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    suppressErrorRendering: true,
    theme,
    fontFamily: "inherit",
    // Mermaid's HTML labels are removed by the deliberately strict SVG sanitizer.
    // Native SVG text preserves labels without admitting foreignObject HTML.
    htmlLabels: false,
    flowchart: { htmlLabels: false },
  };
}

function firstDiagramLine(lines: string[]): number {
  return lines.findIndex((line) => line.trim() && !line.trimStart().startsWith("%%"));
}

function diagramKindFromLines(lines: string[]): MermaidDiagramKind {
  const index = firstDiagramLine(lines);
  const header = index >= 0 ? lines[index].trim().toLowerCase() : "";
  if (/^(flowchart|graph)\s+(td|tb|bt|lr|rl)\b/u.test(header)) return "flowchart";
  if (header === "classdiagram") return "class";
  if (header === "sequencediagram") return "sequence";
  if (header === "statediagram" || header === "statediagram-v2") return "state";
  return "other";
}

function malformedAliasMessage(line: string, kind: MermaidDiagramKind): string | null {
  const value = line.trim();
  if (!value || value.startsWith("%%")) return null;
  if (/^uml\b/iu.test(value)) return "Use `uml class`, `uml sequence`, or `uml state`.";
  if (kind === "class" && !/(--|\.\.|<\|)/u.test(value) && /\b(extends|implements|contains|has|uses)\b/iu.test(value)) {
    return "Use two simple class names, for example `Note extends Resource` or `Module has Note`.";
  }
  if (kind === "class" && /^(public|private|protected|package)\b/iu.test(value)) {
    return "Use `public title: String` for a field or `public save()` for a method.";
  }
  if (kind === "sequence" && /\b(sends|replies)\b/iu.test(value)) {
    return "Use `Sender sends Receiver: message` or `Receiver replies Sender: message`.";
  }
  if (kind === "state" && (/^start\b/iu.test(value) || /\bend\s*$/iu.test(value)) && !value.includes("-->")) {
    return "Use `start -> Draft` or `Draft -> end`.";
  }
  return null;
}

/**
 * Expands Threadwise's small, line-oriented UML shorthand into ordinary Mermaid.
 * It intentionally avoids free-form language so a note is never changed by a guess.
 */
export function normalizeMermaidSource(input: string): NormalizedMermaidSource {
  const lines = input.replace(/\r\n?/gu, "\n").split("\n");
  const headerIndex = firstDiagramLine(lines);
  if (headerIndex >= 0) {
    const indent = lines[headerIndex].match(/^\s*/u)?.[0] ?? "";
    const header = lines[headerIndex].trim().toLowerCase();
    const aliases: Record<string, string> = {
      "uml class": "classDiagram",
      "uml sequence": "sequenceDiagram",
      "uml state": "stateDiagram-v2",
      flow: "flowchart TD",
    };
    if (aliases[header]) lines[headerIndex] = `${indent}${aliases[header]}`;
  }

  const kind = diagramKindFromLines(lines);
  const issues: MermaidAliasIssue[] = [];
  const relation = new RegExp(`^(\\s*)(${IDENTIFIER})\\s+(extends|implements|contains|has|uses)\\s+(${IDENTIFIER})\\s*$`, "iu");
  const field = new RegExp(`^(\\s*)(public|private|protected|package)\\s+(${IDENTIFIER})\\s*:\\s*(\\S(?:.*\\S)?)\\s*$`, "iu");
  const method = new RegExp(`^(\\s*)(public|private|protected|package)\\s+(${IDENTIFIER}\\s*\\([^)]*\\))(?:\\s*:\\s*(\\S(?:.*\\S)?))?\\s*$`, "iu");
  const message = new RegExp(`^(\\s*)(${IDENTIFIER})\\s+(sends|replies)\\s+(${IDENTIFIER})\\s*:\\s*(\\S(?:.*\\S)?)\\s*$`, "iu");
  const startState = new RegExp(`^(\\s*)start\\s*->\\s*(${IDENTIFIER})(?:\\s*:\\s*(\\S(?:.*\\S)?))?\\s*$`, "iu");
  const endState = new RegExp(`^(\\s*)(${IDENTIFIER})\\s*->\\s*end(?:\\s*:\\s*(\\S(?:.*\\S)?))?\\s*$`, "iu");
  const stateTransition = new RegExp(`^(\\s*)(${IDENTIFIER})\\s*->\\s*(${IDENTIFIER})(?:\\s*:\\s*(\\S(?:.*\\S)?))?\\s*$`, "iu");

  for (let index = 0; index < lines.length; index += 1) {
    if (index === headerIndex) continue;
    const line = lines[index];
    let match: RegExpMatchArray | null;

    if (kind === "class" && (match = line.match(relation))) {
      const [, indent, left, verbValue, right] = match;
      const verb = verbValue.toLowerCase();
      if (verb === "extends") lines[index] = `${indent}${right} <|-- ${left}`;
      else if (verb === "implements") lines[index] = `${indent}${right} <|.. ${left}`;
      else if (verb === "contains") lines[index] = `${indent}${left} *-- ${right}`;
      else if (verb === "has") lines[index] = `${indent}${left} o-- ${right}`;
      else lines[index] = `${indent}${left} ..> ${right}`;
      continue;
    }
    if (kind === "class" && (match = line.match(method))) {
      const [, indent, visibility, signature, returnType] = match;
      lines[index] = `${indent}${VISIBILITY[visibility.toLowerCase() as keyof typeof VISIBILITY]}${signature.replace(/\s+/gu, "")}${returnType ? ` ${returnType}` : ""}`;
      continue;
    }
    if (kind === "class" && (match = line.match(field))) {
      const [, indent, visibility, name, type] = match;
      lines[index] = `${indent}${VISIBILITY[visibility.toLowerCase() as keyof typeof VISIBILITY]}${type} ${name}`;
      continue;
    }
    if (kind === "sequence" && (match = line.match(message))) {
      const [, indent, sender, verbValue, receiver, text] = match;
      lines[index] = `${indent}${sender}${verbValue.toLowerCase() === "replies" ? "-->>" : "->>"}${receiver}: ${text}`;
      continue;
    }
    if (kind === "state" && (match = line.match(startState))) {
      const [, indent, state, label] = match;
      lines[index] = `${indent}[*] --> ${state}${label ? ` : ${label}` : ""}`;
      continue;
    }
    if (kind === "state" && (match = line.match(endState))) {
      const [, indent, state, label] = match;
      lines[index] = `${indent}${state} --> [*]${label ? ` : ${label}` : ""}`;
      continue;
    }
    if (kind === "state" && (match = line.match(stateTransition))) {
      const [, indent, from, to, label] = match;
      lines[index] = `${indent}${from} --> ${to}${label ? ` : ${label}` : ""}`;
      continue;
    }

    const issue = malformedAliasMessage(line, kind);
    if (issue) issues.push({ line: index + 1, message: issue });
  }

  const source = lines.join("\n");
  return { source, changed: source !== input, issues };
}

export function getMermaidDiagramInfo(input: string): { kind: MermaidDiagramKind; label: string; layout: MermaidLayout | null; layoutSupported: boolean } {
  const source = normalizeMermaidSource(input).source;
  const lines = source.split("\n");
  const kind = diagramKindFromLines(lines);
  const labels: Record<MermaidDiagramKind, string> = {
    flowchart: "Flowchart",
    class: "Class diagram",
    sequence: "Sequence diagram",
    state: "State diagram",
    other: "Mermaid diagram",
  };
  if (kind === "flowchart") {
    const header = lines[firstDiagramLine(lines)]?.trim() ?? "";
    const direction = header.match(/^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/iu)?.[1]?.toUpperCase();
    return { kind, label: labels[kind], layout: direction === "LR" || direction === "RL" ? "horizontal" : "vertical", layoutSupported: true };
  }
  if (kind === "class" || kind === "state") {
    const direction = lines.map((line) => line.trim()).find((line) => /^direction\s+(TD|TB|BT|LR|RL)$/iu.test(line))?.split(/\s+/u)[1]?.toUpperCase();
    return { kind, label: labels[kind], layout: direction === "LR" || direction === "RL" ? "horizontal" : "vertical", layoutSupported: true };
  }
  return { kind, label: labels[kind], layout: null, layoutSupported: false };
}

export function setMermaidLayout(input: string, choice: MermaidLayoutChoice): string {
  const normalized = normalizeMermaidSource(input).source;
  const lines = normalized.split("\n");
  const headerIndex = firstDiagramLine(lines);
  const kind = diagramKindFromLines(lines);
  if (headerIndex < 0 || !["flowchart", "class", "state"].includes(kind)) return normalized;

  if (kind === "flowchart") {
    const match = lines[headerIndex].match(/^(\s*)(flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b(.*)$/iu);
    if (!match) return normalized;
    const direction = choice === "horizontal" ? "LR" : "TD";
    lines[headerIndex] = `${match[1]}${match[2]} ${direction}${match[3]}`;
    return lines.join("\n");
  }

  const directionIndex = lines.findIndex((line, index) => index > headerIndex && /^\s*direction\s+(TD|TB|BT|LR|RL)\s*$/iu.test(line));
  if (choice === "default") {
    if (directionIndex >= 0) lines.splice(directionIndex, 1);
  } else {
    const direction = choice === "horizontal" ? "LR" : "TB";
    if (directionIndex >= 0) {
      const indent = lines[directionIndex].match(/^\s*/u)?.[0] ?? "  ";
      lines[directionIndex] = `${indent}direction ${direction}`;
    } else lines.splice(headerIndex + 1, 0, `  direction ${direction}`);
  }
  return lines.join("\n");
}

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
