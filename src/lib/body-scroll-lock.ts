"use client";

/** Stops the page behind a modal from scrolling. Used by `useModal` and any dialog that opens over the page. */
import { useEffect } from "react";

type LockableBody = HTMLElement;

type BodyLockState = {
  count: number;
  previousOverflow: string;
};

const bodyLocks = new WeakMap<LockableBody, BodyLockState>();

/**
 * Locks body scrolling and returns a release function. Locks are counted per element, so two stacked
 * dialogs can open and close in any order and the page only scrolls again after the last one closes.
 * This fixed a bug where closing one of two modals restored scrolling too early or not at all.
 */
export function acquireBodyScrollLock(body: LockableBody): () => void {
  const existing = bodyLocks.get(body);
  const state = existing ?? { count: 0, previousOverflow: body.style.overflow };
  state.count += 1;
  bodyLocks.set(body, state);
  body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const current = bodyLocks.get(body);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;

    body.style.overflow = current.previousOverflow;
    bodyLocks.delete(body);
  };
}

/** Hook form: holds the lock while the component is mounted. */
export function useBodyScrollLock(): void {
  useEffect(() => acquireBodyScrollLock(document.body), []);
}
