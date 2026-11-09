"use client";

/** Shared modal behaviour hook used by the Threadwise dialogs and sheets (a few Study dialogs still keep their own listeners). */
import { useEffect, useRef, type RefObject } from "react";
import { acquireBodyScrollLock } from "./body-scroll-lock";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable='true'], [tabindex]:not([tabindex='-1'])";

/* Open modals in mount order. Only the top one reacts to Escape and Tab, so closing a sheet
 * stacked on another (a palette over an editor, say) closes just that sheet. */
const openModals: object[] = [];

type ModalOptions = {
  /** What to focus on open. Defaults to the first focusable element; `false` leaves focus alone. */
  initialFocus?: RefObject<HTMLElement | null> | false;
  /** The element Tab cycles inside, when it is not `ref` (for example a nested filing sheet). */
  trapRoot?: () => HTMLElement | null;
};

/** The behaviour every Threadwise modal shares, written once: focus the dialog on open, keep Tab
 * inside it, close on Escape, take the reference-counted page scroll lock, and give focus back to
 * whatever had it when the modal closes. `onClose` may change on every render without re-running
 * any of this. */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: () => void, options: ModalOptions = {}) {
  const latest = useRef({ onClose, options });
  useEffect(() => { latest.current = { onClose, options }; });

  useEffect(() => {
    const token = {};
    openModals.push(token);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = acquireBodyScrollLock(document.body);
    const frame = window.requestAnimationFrame(() => {
      const { initialFocus } = latest.current.options;
      const container = ref.current;
      if (initialFocus === false || !container || container.contains(document.activeElement)) return;
      (initialFocus?.current ?? container.querySelector<HTMLElement>(`[autofocus], ${FOCUSABLE}`))?.focus();
    });
    const keydown = (event: KeyboardEvent) => {
      if (openModals.at(-1) !== token) return;
      // A control inside the modal (an open picker, say) that already handled Escape keeps the modal open.
      if (event.key === "Escape") { if (event.defaultPrevented) return; event.preventDefault(); latest.current.onClose(); return; }
      const root = latest.current.options.trapRoot?.() ?? ref.current;
      if (event.key !== "Tab" || !root) return;
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      openModals.splice(openModals.indexOf(token), 1);
      releaseScroll();
      previousFocus?.focus();
    };
  }, [ref]);
}
