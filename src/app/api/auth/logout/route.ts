/**
 * Signs the browser out. The backend session is revoked first; the cookie is only deleted once that works.
 * If revocation fails the user gets a 503 and keeps the cookie, so they can retry instead of believing they
 * are signed out while the session is still live.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/auth";
import { revokeBrowserSession } from "../../../../lib/browser-session-registry";

/** Same-origin POST only, so another site cannot sign the user out. */
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
