import type { DashboardOverviewQuote } from "./types";

export const BUILT_IN_OVERVIEW_QUOTES: readonly DashboardOverviewQuote[] = [
  { text: "Pick one thing. Start there." },
  { text: "Make the next move obvious." },
  { text: "Clear one loose end." },
  { text: "Small progress still counts." },
  { text: "Future you says thanks." },
  { text: "Today has enough tabs open." },
  { text: "Start small. Momentum can do the rest." },
  { text: "One useful thing at a time." },
  { text: "Life does not get better by chance. It gets better by change", author: "Jim Rohn" },
  { text: "To exist is to change, to change is to mature, to mature is to keep creating oneself endlessly", author: "Henry Bergson" },
] as const;

export function dailyOverviewLine(now: Date | string, timezone: string, personalQuotes: readonly DashboardOverviewQuote[] = []): string {
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

  const quotes = [...BUILT_IN_OVERVIEW_QUOTES, ...personalQuotes];
  const quote = quotes[numericDate % quotes.length]!;
  return `${quote.text}${quote.author ? ` — ${quote.author}` : ""}`;
}

