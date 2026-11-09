"use client";

/**
 * Signs the user in when the dashboard is opened inside Telegram as a Mini App.
 * Used by the landing page (`src/app/page.tsx`). It posts Telegram's signed launch data to
 * `/api/auth/telegram-mini-app`, which verifies it and sets the session cookie.
 */
import { useEffect, useRef, useState } from "react";

/** The small part of Telegram's `window.Telegram.WebApp` object this component uses. */
type TelegramWebApp = {
  initData: string;
  platform?: string;
  ready(): void;
  expand(): void;
  close?(): void;
  disableVerticalSwipes?(): void;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

/**
 * Renders nothing in a normal browser. Inside Telegram it waits briefly for the WebApp
 * script, sends `initData` to the login route once, then redirects to the returned path.
 * Shows a "legacy" card when Telegram gives no signed data (the card asks the user to reopen
 * from the latest bot menu),
 * and a "failed" card when verification fails.
 */
export function TelegramMiniAppAuth() {
  const started = useRef(false);
  const [state, setState] = useState<"idle" | "connecting" | "legacy" | "failed">("idle");

  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * Polls up to 10 times (120 ms apart) for the Telegram script, then logs in once.
     * Only same-site relative redirects are followed, so a bad response cannot send the user away.
     */
    const connect = async () => {
      const webApp = (window as TelegramWindow).Telegram?.WebApp;
      if (!webApp) {
        if (attempts++ < 10) timer = setTimeout(connect, 120);
        return;
      }

      webApp.ready();
      webApp.expand();
      webApp.disableVerticalSwipes?.();
      if (!webApp.initData) {
        if (webApp.platform && webApp.platform !== "unknown") setState("legacy");
        return;
      }
      if (started.current) return;
      started.current = true;
      setState("connecting");

      try {
        const response = await fetch("/api/auth/telegram-mini-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: webApp.initData }),
          cache: "no-store",
        });
        const result = (await response.json()) as { redirectTo?: string };
        if (!response.ok || !result.redirectTo?.startsWith("/") || result.redirectTo.startsWith("//")) throw new Error("Mini App authentication failed");
        window.location.replace(result.redirectTo);
      } catch {
        setState("failed");
      }
    };

    void connect();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (state === "idle") return null;
  const legacy = state === "legacy";
  const failed = state === "failed";

  return (
    <div className="telegram-auth-overlay" role={failed || legacy ? "alert" : "status"} aria-live="polite">
      <div className="telegram-auth-card">
        <span>{legacy ? "One quick refresh" : failed ? "Connection interrupted" : "Secure Telegram sign-in"}</span>
        <h1>{legacy ? "Open Threadwise from the latest bot menu." : failed ? "We could not verify this launch." : "Opening your dashboard…"}</h1>
        <p>
          {legacy
            ? "Return to the bot, send /start once, then tap Dashboard in the new menu. You will not need a QR code."
            : failed
              ? "Return to Threadwise and tap Dashboard again. No password or database credential was exposed."
              : "Telegram is confirming your identity. No QR code or second login is required."}
        </p>
        {(legacy || failed) && (
          <button className="button button-primary" type="button" onClick={() => (window as TelegramWindow).Telegram?.WebApp?.close?.()}>
            Return to Threadwise
          </button>
        )}
      </div>
    </div>
  );
}
