import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "threadwise_session";
export const WORKSPACE_COOKIE = "threadwise_workspace";

export type SessionUser = {
  telegramId: string;
  firstName: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  expiresAt: number;
};

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}
function signature(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(user: Omit<SessionUser, "expiresAt">) {
  const payload = encode(
    JSON.stringify({
      ...user,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  );
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string): SessionUser | null {
  if (!token) return null;
  const [payload, provided] = token.split(".");
  if (!payload || !provided || !process.env.AUTH_SECRET) return null;

  const expected = signature(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser;
    if (!user.telegramId || user.expiresAt < Date.now()) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function getSelectedWorkspace() {
  const store = await cookies();
  const value = store.get(WORKSPACE_COOKIE)?.value;
  return value && /^(?:personal|[0-9a-f-]{36})$/i.test(value) ? value : "personal";
}

export function isTelegramAuthConfigured() {
  return Boolean(
    process.env.TELEGRAM_OIDC_CLIENT_ID &&
      process.env.TELEGRAM_OIDC_CLIENT_SECRET &&
      process.env.AUTH_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}
