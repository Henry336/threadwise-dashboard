import { NextRequest, NextResponse } from "next/server";
import { WORKSPACE_COOKIE } from "@/lib/auth";

const WORKSPACE = /^(?:personal|[0-9a-f-]{36})$/i;

export function GET(request: NextRequest) {
  const workspace = request.nextUrl.searchParams.get("workspace") ?? "personal";
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  if (!WORKSPACE.test(workspace)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  const next = requestedNext.startsWith("/dashboard") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(WORKSPACE_COOKIE, workspace, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
