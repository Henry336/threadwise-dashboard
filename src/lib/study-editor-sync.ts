/** Decides when the rich note editor should load new Markdown from outside. */
/**
 * True only when the incoming Markdown is a real outside change. It ignores the value the editor just sent
 * up itself, because replacing the document with its own autosave echo used to reset the cursor while typing.
 */
export function shouldReplaceEditorDocument(
  incomingMarkdown: string,
  lastLocallyEmittedMarkdown: string,
  currentEditorMarkdown: string,
): boolean {
  if (incomingMarkdown === lastLocallyEmittedMarkdown) return false;
  return incomingMarkdown !== currentEditorMarkdown;
}
