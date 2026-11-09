"use client";

/**
 * Clears locally stored drafts when the user logs out, so the next person on a shared
 * browser cannot read them. Mounted once from the root layout (`src/app/layout.tsx`).
 */
import { useEffect } from "react";
import { clearThreadwiseDrafts } from "@/lib/browser-drafts";

/**
 * Renders nothing. Listens (capture phase) for any form submit to `/api/auth/logout` and
 * wipes Threadwise drafts from localStorage first. A storage error never blocks logout.
 */
export function BrowserPrivacyLifecycle() {
  useEffect(() => {
    const clearDraftsOnLogout = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || new URL(form.action, window.location.href).pathname !== "/api/auth/logout") return;
      try { clearThreadwiseDrafts(window.localStorage); } catch { /* Logout must continue even without storage. */ }
    };
    document.addEventListener("submit", clearDraftsOnLogout, true);
    return () => document.removeEventListener("submit", clearDraftsOnLogout, true);
  }, []);
  return null;
}
