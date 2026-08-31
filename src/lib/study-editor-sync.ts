export function shouldReplaceEditorDocument(
  incomingMarkdown: string,
  lastLocallyEmittedMarkdown: string,
  currentEditorMarkdown: string,
): boolean {
  if (incomingMarkdown === lastLocallyEmittedMarkdown) return false;
  return incomingMarkdown !== currentEditorMarkdown;
}
