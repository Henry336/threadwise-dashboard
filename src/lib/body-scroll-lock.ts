"use client";

import { useEffect } from "react";

type LockableBody = HTMLElement;

type BodyLockState = {
  count: number;
  previousOverflow: string;
};

const bodyLocks = new WeakMap<LockableBody, BodyLockState>();

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

export function useBodyScrollLock(): void {
  useEffect(() => acquireBodyScrollLock(document.body), []);
}
