import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

const JWKS = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));

function fail(request: NextRequest, reason: string) {
  const response = NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(reason)}`, request.url));
  response.cookies.delete("threadwise_oauth_state");
  response.cookies.delete("threadwise_oauth_nonce");
  response.cookies.delete("threadwise_oauth_verifier");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("threadwise_oauth_state")?.value;
  const nonce = request.cookies.get("threadwise_oauth_nonce")?.value;
  const verifier = request.cookies.get("threadwise_oauth_verifier")?.value;
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_OIDC_CLIENT_SECRET;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = configuredOrigin ?? (process.env.NODE_ENV === "development" ? request.nextUrl.origin : null);
  if (!code || !state || !storedState || state !== storedState || !nonce || !verifier) return fail(request, "invalid-state");
  if (!clientId || !clientSecret || !process.env.AUTH_SECRET || !origin) return fail(request, "not-configured");
  try {
    const appOrigin = new URL(origin).origin;
    const redirectUri = new URL("/api/auth/callback", appOrigin).toString();
    const tokenResponse = await fetch("https://oauth.telegram.org/token", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail(request, "token-exchange");
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) return fail(request, "missing-id-token");
    const { payload } = await jwtVerify(tokens.id_token, JWKS, { issuer: "https://oauth.telegram.org", audience: clientId });
    if (payload.nonce !== nonce) return fail(request, "invalid-nonce");
    const telegramId = payload.id;
    if (typeof telegramId !== "number" && typeof telegramId !== "string") return fail(request, "missing-profile");
    const fullName = typeof payload.name === "string" ? payload.name : "Threadwise user";
    const token = createSessionToken({
      telegramId: String(telegramId),
      firstName: typeof payload.given_name === "string" ? payload.given_name : fullName.split(" ")[0],
      fullName,
      username: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
      avatarUrl: typeof payload.picture === "string" ? payload.picture : undefined,
    });
    const response = NextResponse.redirect(new URL("/dashboard", appOrigin));
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.delete("threadwise_oauth_state");
    response.cookies.delete("threadwise_oauth_nonce");
    response.cookies.delete("threadwise_oauth_verifier");
    return response;
  } catch {
    return fail(request, "verification-failed");
  }
}
