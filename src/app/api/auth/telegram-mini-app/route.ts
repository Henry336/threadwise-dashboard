import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import {
  TelegramMiniAppAuthenticationError,
  verifyTelegramMiniAppInitData,
} from "@/lib/telegram-mini-app";

const MAX_REQUEST_BYTES = 20_000;

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

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
    const token = createSessionToken(user);
    const response = json({ ok: true, redirectTo: "/dashboard" }, 200);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof TelegramMiniAppAuthenticationError) {
      return json({ error: "invalid_telegram_data" }, 401);
    }
    return json({ error: "invalid_request" }, 400);
  }
}
