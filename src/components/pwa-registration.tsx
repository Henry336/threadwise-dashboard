"use client";

/**
 * Registers the service worker (`public/sw.js`) so the dashboard can be installed as a PWA
 * and can show the offline page. Mounted once from the root layout (`src/app/layout.tsx`).
 */
import { useEffect } from "react";

/**
 * Renders nothing; on mount it registers `/sw.js` for the whole site.
 * Skipped outside production so a cached worker never serves stale dev builds.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return null;
}

