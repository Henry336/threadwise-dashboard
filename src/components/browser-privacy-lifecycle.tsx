"use client";

import { useEffect } from "react";
import { clearThreadwiseDrafts } from "@/lib/browser-drafts";

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
