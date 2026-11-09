"use client";

/**
 * Shared modal sheet for Study mode editors (used by `study-dashboard.tsx` and
 * `study-deep-work.tsx`). Focus trap, Escape and scroll lock come from `useModal`.
 */
import { useCallback, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useModal } from "@/lib/use-modal";
import { useConfirmation } from "./confirmation-dialog";

/**
 * Study modal shell. `children` is a render function that receives `requestClose`, so a form
 * inside closes through the same "discard unsaved changes?" check as the X button, Escape
 * and a backdrop click. Pass `dirty` when the form has unsaved edits.
 */
export function StudyDialog({ kicker, title, dirty = false, wide = false, onClose, children }: { kicker: string; title: string; dirty?: boolean; wide?: boolean; onClose: () => void; children: (requestClose: () => void) => ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const confirm = useConfirmation();
  const requestClose = useCallback(() => {
    void (async () => {
      if (dirty && !await confirm({ title: "Discard unsaved changes?", message: "Your changes in this editor will be lost.", confirmLabel: "Discard", tone: "danger" })) return;
      onClose();
    })();
  }, [confirm, dirty, onClose]);

  useModal(dialogRef, requestClose);

  return <div className="study-sheet-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section ref={dialogRef} className={`study-sheet${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="study-dialog-title">
      <header><div><span>{kicker}</span><h2 id="study-dialog-title">{title}</h2></div><button type="button" onClick={requestClose} aria-label={`Close ${title}`}><X size={20} /></button></header>
      {children(requestClose)}
    </section>
  </div>;
}


