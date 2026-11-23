// How old a material price is. A simulation multiplies today's price, so a price that has not been
// updated for a long time (or whose date is unknown) makes the simulated impact unreliable.

/** Prices older than this many days are flagged as stale. */
export const STALE_PRICE_DAYS = 90;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses an Airtable date ("2026-03-03") into its UTC day, or null when it is not a valid date. */
function utcDay(isoDate: string): number | null {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? time : null;
}

/** Whole days between the price date and today's local calendar day; null when the date is missing or invalid. */
export function priceAgeDays(updatedOn: string | null, today: Date): number | null {
  const updated = updatedOn === null ? null : utcDay(updatedOn);
  if (updated === null) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((todayUtc - updated) / DAY_MS));
}

/** True when the price is older than STALE_PRICE_DAYS or its date is unknown. */
export function isStalePrice(updatedOn: string | null, today: Date): boolean {
  const age = priceAgeDays(updatedOn, today);
  return age === null || age > STALE_PRICE_DAYS;
}

/** The oldest of several price dates; null when any of them is unknown, because then the oldest is unknown too. */
export function oldestPriceDate(dates: (string | null)[]): string | null {
  if (dates.length === 0 || dates.some((date) => date === null || utcDay(date) === null)) return null;
  return (dates as string[]).reduce((oldest, date) => (date < oldest ? date : oldest));
}
