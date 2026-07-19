import { NextRequest, NextResponse } from "next/server";
import { getSelectedWorkspace, getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { threadwiseFetch } from "@/lib/threadwise-api";

export const dynamic = "force-dynamic";

const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 96_000;

function isAllowedPath(path: string) {
  return /^(?:snapshot|workspaces|events|capture\/preview|tasks(?:\/[A-Za-z0-9_-]+)?|notes(?:\/[A-Za-z0-9_-]+)?|ideas(?:\/[A-Za-z0-9_-]+(?:\/(?:convert-to-task|analyze))?)?|expenses(?:\/[A-Za-z0-9_-]+)?|search|settings|images(?:\/[A-Za-z0-9_-]+(?:\/content)?)?|integrations\/(?:gmail|calendar|excel)\/disconnect|integrations\/excel\/sync|privacy\/(?:export|account))$/.test(path);
}

function methodAllowed(method: string, path: string) {
  if (path === "snapshot" || path === "workspaces" || path === "events" || path === "search" || path === "privacy/export" || /\/content$/.test(path)) return method === "GET";
  if (path === "capture/preview") return method === "POST";
  if (path === "settings") return method === "GET" || method === "PATCH";
  if (/^(tasks|notes|ideas|expenses|images)$/.test(path)) return method === "GET" || method === "POST" && path !== "images";
  if (/^integrations\/.+\/disconnect$/.test(path) || path === "integrations/excel/sync" || /\/(?:convert-to-task|analyze)$/.test(path)) return method === "POST";
  if (path === "privacy/account") return method === "DELETE";
  if (/^(tasks|notes|ideas|expenses|images)\//.test(path)) return method === "PATCH" || method === "DELETE";
  return false;
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function reject(status: number, error: string, message?: string) {
  return noStore(NextResponse.json({ error, ...(message ? { message } : {}) }, { status }));
}

function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const actual = new URL(origin).origin;
    const configured = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : request.nextUrl.origin;
    return actual === configured || (process.env.NODE_ENV === "development" && actual === request.nextUrl.origin);
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const method = request.method.toUpperCase();
  if (!new Set(["GET", "POST", "PATCH", "DELETE"]).has(method)) return reject(405, "method_not_allowed");

  const user = await getSessionUser();
  if (!user) return reject(401, "unauthorized", "Sign in with Telegram to continue.");
  if (MUTATION_METHODS.has(method) && !hasSameOrigin(request)) return reject(403, "invalid_origin");

  const { path: segments = [] } = await context.params;
  const path = segments.map(decodeURIComponent).join("/");
  if (!isAllowedPath(path) || !methodAllowed(method, path)) return reject(404, "not_found");

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return reject(413, "payload_too_large");

  let body: string | undefined;
  if (method === "POST" || method === "PATCH" || method === "DELETE") {
    body = await request.text();
    if (body.length > MAX_BODY_BYTES) return reject(413, "payload_too_large");
    if (body) {
      try { JSON.parse(body); } catch { return reject(400, "invalid_json"); }
    }
  }

  try {
    const workspace = path === "workspaces" ? "personal" : await getSelectedWorkspace();
    const query = request.nextUrl.searchParams.toString();
    const upstream = await threadwiseFetch(user, `${path}${query ? `?${query}` : ""}`, {
      method,
      headers: body ? { "Content-Type": "application/json", Accept: request.headers.get("accept") ?? "application/json" } : { Accept: request.headers.get("accept") ?? "application/json" },
      body,
      ...(path === "events" ? { signal: request.signal } : {}),
    }, workspace);

    if (path === "events" && upstream.ok && upstream.body) {
      const response = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
      response.headers.set("Vary", "Cookie");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const payload = await upstream.arrayBuffer();
    if (payload.byteLength > 20_000_000) return reject(502, "upstream_response_too_large");
    const response = new NextResponse(payload, { status: upstream.status });
    response.headers.set("Content-Type", contentType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) response.headers.set("Content-Disposition", disposition);
    if (path === "privacy/account" && method === "DELETE" && upstream.ok) response.cookies.delete(SESSION_COOKIE);
    return noStore(response);
  } catch {
    return reject(502, "threadwise_unavailable", "Threadwise could not complete that request. Please try again.");
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
