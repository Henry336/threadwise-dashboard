import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { revokeBrowserSession } from "../../../../lib/browser-session-registry";

export async function POST(request: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const expectedOrigin = configuredOrigin ?? (process.env.NODE_ENV === "development" ? request.nextUrl.origin : null);
  if (!expectedOrigin || request.headers.get("origin") !== new URL(expectedOrigin).origin) {
    return new NextResponse("Invalid origin", { status: 403 });
  }
  const user = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (user) {
    try {
      await revokeBrowserSession(user.telegramId, user.sessionId);
    } catch {
      return new NextResponse("Threadwise could not sign you out safely. Please try again.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
