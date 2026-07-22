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

function hyphenateUuid(value: string): string {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
