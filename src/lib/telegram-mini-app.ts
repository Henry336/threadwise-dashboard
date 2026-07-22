import "server-only";

import { createPublicKey, verify as verifySignature } from "node:crypto";

const TELEGRAM_PRODUCTION_PUBLIC_KEY = "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const MAX_INIT_DATA_BYTES = 16_000;
const MAX_AUTH_AGE_SECONDS = 15 * 60;
const CLOCK_SKEW_SECONDS = 30;

export type TelegramMiniAppUser = {
  telegramId: string;
  firstName: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  startParam?: string;
};

export class TelegramMiniAppAuthenticationError extends Error {
  constructor() {
    super("Invalid Telegram Mini App authentication data.");
    this.name = "TelegramMiniAppAuthenticationError";
  }
}

export function verifyTelegramMiniAppInitData(
  initData: string,
  botId: string,
  options: { now?: Date; publicKeyHex?: string } = {},
): TelegramMiniAppUser {
  if (!initData || Buffer.byteLength(initData) > MAX_INIT_DATA_BYTES || !/^[1-9]\d{5,19}$/.test(botId)) {
    throw new TelegramMiniAppAuthenticationError();
  }

  const params = new URLSearchParams(initData);
  const signatureText = singleValue(params, "signature");
  const authDateText = singleValue(params, "auth_date");
  const userText = singleValue(params, "user");
  if (!signatureText || !authDateText || !userText) throw new TelegramMiniAppAuthenticationError();

  const authDate = Number(authDateText);
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1_000);
  if (!Number.isInteger(authDate) || authDate > nowSeconds + CLOCK_SKEW_SECONDS || nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new TelegramMiniAppAuthenticationError();
  }

  const dataCheckString = `${botId}:WebAppData\n${[...params.entries()]
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}`;

  const signature = Buffer.from(signatureText, "base64url");
  const rawPublicKey = Buffer.from(options.publicKeyHex ?? TELEGRAM_PRODUCTION_PUBLIC_KEY, "hex");
  if (signature.length !== 64 || rawPublicKey.length !== 32) throw new TelegramMiniAppAuthenticationError();
  const publicKey = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]), format: "der", type: "spki" });
  if (!verifySignature(null, Buffer.from(dataCheckString), publicKey, signature)) {
    throw new TelegramMiniAppAuthenticationError();
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userText) as Record<string, unknown>;
  } catch {
    throw new TelegramMiniAppAuthenticationError();
  }

  const telegramId = telegramUserId(user.id);
  const firstName = cleanText(user.first_name, 120);
  if (!telegramId || !firstName) throw new TelegramMiniAppAuthenticationError();
  const lastName = cleanText(user.last_name, 120);
  const username = cleanText(user.username, 64);
  const avatarUrl = safeHttpsUrl(user.photo_url);
  const startParam = cleanText(singleValue(params, "start_param"), 64);
  return {
    telegramId,
    firstName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    ...(username ? { username } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(startParam ? { startParam } : {}),
  };
}

function singleValue(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : undefined;
}

function telegramUserId(value: unknown): string | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const normalized = String(value);
  return /^[1-9]\d{0,19}$/.test(normalized) ? normalized : undefined;
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : undefined;
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
