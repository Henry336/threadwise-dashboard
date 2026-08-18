import { NextRequest, NextResponse } from "next/server";
import { getSelectedWorkspace, getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { isAllowedThreadwiseProxyMethod, isAllowedThreadwiseProxyPath } from "@/lib/proxy-allowlist";
import {
  hasAllowedProxyOrigin,
  proxyBodyIsJson,
  proxyBodyIsTooLarge,
  THREADWISE_PROXY_MAX_RESPONSE_BYTES,
} from "@/lib/proxy-security";
import { threadwiseFetch } from "@/lib/threadwise-api";

export const dynamic = "force-dynamic";

const MUTATION_METHODS = new Set(["POST", "PATCH", "DELETE"]);
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
  return hasAllowedProxyOrigin({
    origin: request.headers.get("origin"),
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin: request.nextUrl.origin,
    development: process.env.NODE_ENV === "development",
  });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const method = request.method.toUpperCase();
  if (!new Set(["GET", "POST", "PATCH", "DELETE"]).has(method)) return reject(405, "method_not_allowed");

  const user = await getSessionUser();
  if (!user) return reject(401, "unauthorized", "Sign in with Telegram to continue.");
  if (MUTATION_METHODS.has(method) && !hasSameOrigin(request)) return reject(403, "invalid_origin");

  const { path: segments = [] } = await context.params;
  const path = segments.map(decodeURIComponent).join("/");
  if (!isAllowedThreadwiseProxyPath(path) || !isAllowedThreadwiseProxyMethod(method, path)) return reject(404, "not_found");

  if (proxyBodyIsTooLarge(request.headers.get("content-length"))) return reject(413, "payload_too_large");

  let body: string | undefined;
  if (method === "POST" || method === "PATCH" || method === "DELETE") {
    body = await request.text();
    if (proxyBodyIsTooLarge(null, body.length)) return reject(413, "payload_too_large");
    if (!proxyBodyIsJson(body)) return reject(400, "invalid_json");
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
    if (payload.byteLength > THREADWISE_PROXY_MAX_RESPONSE_BYTES) return reject(502, "upstream_response_too_large");
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
