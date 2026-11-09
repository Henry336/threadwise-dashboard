/**
 * Turns a Telegram Mini App `start_param` into a dashboard URL. The bot builds these payloads in the
 * backend's `src/bot/links.ts` for group find-a-time links: `fts_` opens scheduling, `ftn_` opens a new poll,
 * `ftp_` opens one poll. The workspace UUID is sent without hyphens to fit Telegram's length limit.
 */
/**
 * The path to send the user to after Mini App login. It goes through `/api/workspace/select` so the right
 * group workspace is selected first. Anything unrecognised just opens `/dashboard`.
 */
export function miniAppRedirect(startParam: string | undefined): string {
  if (!startParam) return "/dashboard";
  const match = startParam.match(/^ft([nps])_([0-9a-f]{32})(?:_(TIME[0-9A-F]{6}))?$/i);
  if (!match) return "/dashboard";

  const workspace = hyphenateUuid(match[2]!);
  const mode = match[1]!.toLowerCase();
  const publicId = match[3] ? `TIME-${match[3].slice(4).toUpperCase()}` : undefined;
  const dashboard = new URL("https://threadwise.local/dashboard");
  dashboard.searchParams.set("view", "schedule");
  if (mode === "n") dashboard.searchParams.set("new", "1");
  if (mode === "p" && publicId) dashboard.searchParams.set("poll", publicId);

  const select = new URL("https://threadwise.local/api/workspace/select");
  select.searchParams.set("workspace", workspace);
  select.searchParams.set("next", `${dashboard.pathname}${dashboard.search}`);
  return `${select.pathname}${select.search}`;
}

/** Puts the hyphens back into a 32-character hex UUID. */
function hyphenateUuid(value: string): string {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
