"use client";

/**
 * Branded replacement for `window.confirm()`. `ConfirmationProvider` wraps the app and
 * `useConfirmation()` returns an async `confirm(request)` that resolves true or false.
 * Native confirm dialogs are banned in this project for look and consistency.
 */
import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/lib/use-modal";

export type ConfirmationRequest = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PendingConfirmation = ConfirmationRequest & { resolve: (confirmed: boolean) => void };
const ConfirmationContext = createContext<((request: ConfirmationRequest) => Promise<boolean>) | null>(null);

/**
 * Holds at most one pending confirmation. A new request cancels (resolves false) the one before,
 * so callers never wait forever.
 */
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

/** Returns the `confirm` function. Throws if used outside `ConfirmationProvider`. */
export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error("useConfirmation must be used inside ConfirmationProvider.");
  return context;
}

/**
 * The dialog itself. While open it makes every other top-level element `inert` so the page behind
 * cannot be clicked or focused. `useModal` locks scroll, traps Tab, maps Escape to Cancel and returns
 * focus on close; being on its modal stack means Escape cancels only this dialog, not the editor under it.
 * Focus starts on Cancel (the safe choice).
 */
function ThreadwiseConfirmationDialog({ request, onSettle }: { request: PendingConfirmation; onSettle: (confirmed: boolean) => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useModal(dialogRef, () => onSettle(false), { initialFocus: cancelRef });

  useEffect(() => {
    // Captured here and restored after `inert` is removed: useModal's own focus restore runs first,
    // while the background is still inert, so on its own it would leave focus on the page body.
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = overlayRef.current;
    const background = overlay
      ? [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      : [];
    const alreadyInert = new Map(background.map((element) => [element, element.hasAttribute("inert")]));
    for (const element of background) element.setAttribute("inert", "");
    return () => {
      for (const element of background) {
        if (!alreadyInert.get(element)) element.removeAttribute("inert");
      }
      returnFocus?.focus();
    };
  }, []);

  return createPortal(<div ref={overlayRef} className="threadwise-confirm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onSettle(false); }}>
    <section ref={dialogRef} className="threadwise-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="threadwise-confirm-title" aria-describedby="threadwise-confirm-message">
      <span className="threadwise-confirm-icon"><AlertTriangle size={19} /></span>
      <div><p className="threadwise-confirm-kicker">Confirm action</p><h2 id="threadwise-confirm-title">{request.title ?? "Are you sure?"}</h2><p id="threadwise-confirm-message">{request.message}</p></div>
      <footer><button ref={cancelRef} type="button" className="threadwise-confirm-cancel" onClick={() => onSettle(false)}>{request.cancelLabel ?? "Cancel"}</button><button type="button" className={request.tone === "default" ? "threadwise-confirm-submit" : "threadwise-confirm-submit danger"} onClick={() => onSettle(true)}>{request.confirmLabel ?? "Confirm"}</button></footer>
    </section>
  </div>, document.body);
}
