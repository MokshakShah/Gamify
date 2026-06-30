/** Normalizes Supabase date / ISO strings to YYYY-MM-DD. */
export function normalizeDateKey(value: string): string {
  return value.split('T')[0];
}

/** Local calendar date as YYYY-MM-DD (avoids UTC drift in heatmaps). */
export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** One entry per calendar day — multiple visits on the same day count once. */
export function uniqueVisitDates(dates: string[]): string[] {
  return [...new Set(dates.map(normalizeDateKey))].sort();
}
