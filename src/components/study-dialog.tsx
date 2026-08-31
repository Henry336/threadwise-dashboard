"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { useConfirmation } from "./confirmation-dialog";

export function StudyDialog({ kicker, title, dirty = false, wide = false, onClose, children }: { kicker: string; title: string; dirty?: boolean; wide?: boolean; onClose: () => void; children: (requestClose: () => void) => ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const confirm = useConfirmation();
  useBodyScrollLock();
  const requestClose = useCallback(() => {
    void (async () => {
      if (dirty && !await confirm({ title: "Discard unsaved changes?", message: "Your changes in this editor will be lost.", confirmLabel: "Discard", tone: "danger" })) return;
      onClose();
    })();
  }, [confirm, dirty, onClose]);

  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
    first?.focus();
    return () => {
      returnFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      const dialog = dialogRef.current;
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (focusable.length === 0) return;
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) { event.preventDefault(); lastFocusable.focus(); }
      if (!event.shiftKey && document.activeElement === lastFocusable) { event.preventDefault(); firstFocusable.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return <div className="study-sheet-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section ref={dialogRef} className={`study-sheet${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="study-dialog-title">
      <header><div><span>{kicker}</span><h2 id="study-dialog-title">{title}</h2></div><button type="button" onClick={requestClose} aria-label={`Close ${title}`}><X size={20} /></button></header>
      {children(requestClose)}
    </section>
  </div>;
}


