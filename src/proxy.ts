import { NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy, contentSecurityPolicyHeader, contentSecurityPolicyMode } from "@/lib/content-security-policy";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const mode = contentSecurityPolicyMode();
  const policy = buildContentSecurityPolicy(nonce, mode);
  const header = contentSecurityPolicyHeader(mode);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(header, policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(header, policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
