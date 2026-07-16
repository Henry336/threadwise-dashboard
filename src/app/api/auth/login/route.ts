import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const TEN_MINUTES = 60 * 10;
const random = () => randomBytes(32).toString("base64url");

export async function GET(request: NextRequest) {
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = configuredOrigin ?? (process.env.NODE_ENV === "development" ? request.nextUrl.origin : null);
  if (!clientId || !origin) return NextResponse.redirect(new URL("/?authError=not-configured", request.url));
  const redirectUri = new URL("/api/auth/callback", new URL(origin).origin).toString();
  const state = random();
  const nonce = random();
  const verifier = random();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorization = new URL("https://oauth.telegram.org/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("nonce", nonce);
  authorization.searchParams.set("code_challenge", challenge);
  authorization.searchParams.set("code_challenge_method", "S256");
  const response = NextResponse.redirect(authorization);
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: TEN_MINUTES };
  response.cookies.set("threadwise_oauth_state", state, cookie);
  response.cookies.set("threadwise_oauth_nonce", nonce, cookie);
  response.cookies.set("threadwise_oauth_verifier", verifier, cookie);
  return response;
}
