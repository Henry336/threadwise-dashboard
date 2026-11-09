/**
 * Workspace switcher endpoint. Stores the chosen workspace (personal or a group UUID) in an httpOnly cookie
 * and redirects to `next`. The BFF and dashboard page read the cookie; the backend still checks membership.
 */
import { NextRequest, NextResponse } from "next/server";
import { WORKSPACE_COOKIE } from "@/lib/auth";

const WORKSPACE = /^(?:personal|[0-9a-f-]{36})$/i;

/** `next` must stay inside `/dashboard`, so this cannot be used as an open redirect to another site. */
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
