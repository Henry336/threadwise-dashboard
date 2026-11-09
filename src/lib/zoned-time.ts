/* Date helpers that work in the user's chosen time zone, not the browser's. */

const INPUT_PARTS: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

/** The YYYY-MM-DD calendar day an instant falls on in `timezone`, for grouping and "is today" checks. */
export function calendarKey(value: string | Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** A short "9 Mar" style date in `timezone`; `options` adds or overrides fields. */
export function formatDate(value: string, timezone: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: timezone, ...options }).format(new Date(value));
}

/** An ISO instant as the `YYYY-MM-DDTHH:mm` value a datetime-local input shows in `timezone`; empty when unset. */
export function zonedInputDate(value: string | null | undefined, timezone: string): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, ...INPUT_PARTS }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** The reverse of zonedInputDate: a datetime-local value read as wall-clock time in `timezone`,
 * returned as an ISO instant. It corrects the guess a few times so DST offsets land right. */
export function zonedInputToIso(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, ...INPUT_PARTS });
  let instant = desired;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const correction = desired - represented;
    if (!correction) break;
    instant += correction;
  }
  return new Date(instant).toISOString();
}
