const DEFAULT_INDENT = "  ";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function selectedLineStarts(text: string, selectionStart: number, selectionEnd: number): number[] {
  const start = clamp(selectionStart, 0, text.length);
  const end = clamp(selectionEnd, start, text.length);
  const firstLineStart = text.lastIndexOf("\n", Math.max(-1, start - 1)) + 1;
  const lastSelectedOffset = end > start ? end - 1 : start;
  const starts = [firstLineStart];

  let newline = text.indexOf("\n", firstLineStart);
  while (newline >= 0 && newline < lastSelectedOffset) {
    starts.push(newline + 1);
    newline = text.indexOf("\n", newline + 1);
  }
  return starts;
}

export function indentationRemovalWidth(text: string, lineStart: number, indent = DEFAULT_INDENT): number {
  if (text[lineStart] === "\t") return 1;
  let width = 0;
  while (width < indent.length && text[lineStart + width] === " ") width += 1;
  return width;
}

export { DEFAULT_INDENT };
