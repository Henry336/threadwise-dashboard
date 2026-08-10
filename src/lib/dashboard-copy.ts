const DAILY_OVERVIEW_LINES = [
  "Pick one thing. Start there.",
  "Make the next move obvious.",
  "Clear one loose end.",
  "Small progress still counts.",
  "Future you says thanks.",
  "Today has enough tabs open.",
  "Start small. Momentum can do the rest.",
  "One useful thing at a time.",
] as const;

export function dailyOverviewLine(now: Date | string, timezone: string): string {
  const date = typeof now === "string" ? new Date(now) : now;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(date);
  const numericDate = parts.reduce((value, part) => {
    if (part.type === "year") return value + Number(part.value) * 372;
    if (part.type === "month") return value + Number(part.value) * 31;
    if (part.type === "day") return value + Number(part.value);
    return value;
  }, 0);

  return DAILY_OVERVIEW_LINES[numericDate % DAILY_OVERVIEW_LINES.length]!;
}

