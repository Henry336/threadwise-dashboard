"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";

export type ConfirmationRequest = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PendingConfirmation = ConfirmationRequest & { resolve: (confirmed: boolean) => void };
const ConfirmationContext = createContext<((request: ConfirmationRequest) => Promise<boolean>) | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const confirm = useCallback((request: ConfirmationRequest) => new Promise<boolean>((resolve) => {
    setPending((current) => {
      current?.resolve(false);
      return { ...request, resolve };
    });
  }), []);
  const settle = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);
  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {pending && <ThreadwiseConfirmationDialog request={pending} onSettle={settle} />}
  </ConfirmationContext.Provider>;
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error("useConfirmation must be used inside ConfirmationProvider.");
  return context;
}

function ThreadwiseConfirmationDialog({ request, onSettle }: { request: PendingConfirmation; onSettle: (confirmed: boolean) => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useBodyScrollLock();

  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const overlay = overlayRef.current;
    const background = overlay
      ? [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      : [];
    const alreadyInert = new Map(background.map((element) => [element, element.hasAttribute("inert")]));
    for (const element of background) element.setAttribute("inert", "");
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSettle(false);
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      for (const element of background) {
        if (!alreadyInert.get(element)) element.removeAttribute("inert");
      }
      returnFocus.current?.focus();
    };
  }, [onSettle]);

  return createPortal(<div ref={overlayRef} className="threadwise-confirm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onSettle(false); }}>
    <section ref={dialogRef} className="threadwise-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="threadwise-confirm-title" aria-describedby="threadwise-confirm-message">
      <span className="threadwise-confirm-icon"><AlertTriangle size={19} /></span>
      <div><p className="threadwise-confirm-kicker">Confirm action</p><h2 id="threadwise-confirm-title">{request.title ?? "Are you sure?"}</h2><p id="threadwise-confirm-message">{request.message}</p></div>
      <footer><button ref={cancelRef} type="button" className="threadwise-confirm-cancel" onClick={() => onSettle(false)}>{request.cancelLabel ?? "Cancel"}</button><button type="button" className={request.tone === "default" ? "threadwise-confirm-submit" : "threadwise-confirm-submit danger"} onClick={() => onSettle(true)}>{request.confirmLabel ?? "Confirm"}</button></footer>
    </section>
  </div>, document.body);
}
