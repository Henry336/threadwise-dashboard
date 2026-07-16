import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const expectedOrigin = configuredOrigin ?? (process.env.NODE_ENV === "development" ? request.nextUrl.origin : null);
  if (!expectedOrigin || request.headers.get("origin") !== new URL(expectedOrigin).origin) {
    return new NextResponse("Invalid origin", { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
