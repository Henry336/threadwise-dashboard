/**
 * Login from inside Telegram (the Mini App). The browser posts Telegram's signed `initData`; this route
 * verifies it, registers a browser session, sets the cookie, and says where to go next (for example a
 * group scheduling poll named in the start parameter). Called by `telegram-mini-app-auth.tsx`.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { registerBrowserSession } from "@/lib/browser-session-registry";
import {
  TelegramMiniAppAuthenticationError,
  verifyTelegramMiniAppInitData,
} from "@/lib/telegram-mini-app";
import { miniAppRedirect } from "@/lib/telegram-start-param";

const MAX_REQUEST_BYTES = 20_000;

/** A JSON reply that is never cached. */
function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Rejects cross-origin and oversized requests before reading the body. Bad Telegram data gives 401; anything else malformed gives 400. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return json({ error: "invalid_origin" }, 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_REQUEST_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  const botId = process.env.TELEGRAM_OIDC_CLIENT_ID;
  if (!botId || !process.env.AUTH_SECRET) {
    return json({ error: "not_configured" }, 503);
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody) > MAX_REQUEST_BYTES) {
      return json({ error: "request_too_large" }, 413);
    }
    const body = JSON.parse(rawBody) as { initData?: unknown };
    if (typeof body.initData !== "string") {
      return json({ error: "invalid_request" }, 400);
    }

    const user = verifyTelegramMiniAppInitData(body.initData, botId);
    const browserSession = await registerBrowserSession(user.telegramId);
    const token = createSessionToken({ ...user, sessionId: browserSession.id }, browserSession.expiresAt);
    const response = json({ ok: true, redirectTo: miniAppRedirect(user.startParam) }, 200);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor((browserSession.expiresAt - Date.now()) / 1_000)),
    });
    return response;
  } catch (error) {
    if (error instanceof TelegramMiniAppAuthenticationError) {
      return json({ error: "invalid_telegram_data" }, 401);
    }
    return json({ error: "invalid_request" }, 400);
  }
}
