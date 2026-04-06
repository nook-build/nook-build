/**
 * Advance by N Mon–Fri days using the **local** calendar (`getDate` / `setDate` / `getDay`).
 * Returns a new `Date`; does not mutate `startDate`.
 *
 * For ISO `YYYY-MM-DD` instants from the API, prefer {@link addUtcWorkingDays} so the
 * result does not depend on the viewer’s timezone.
 */
export function addWorkingDays(startDate: Date, days: number): Date {
  if (days <= 0 || !Number.isFinite(days)) return new Date(startDate.getTime())
  const date = new Date(startDate.getTime())
  let added = 0
  const target = Math.floor(days)
  while (added < target) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return date
}

/**
 * Advance a UTC calendar date by N working days (Mon–Fri only; Sat/Sun skipped).
 * Returns UTC midnight ms for the resulting calendar date (same semantics as
 * {@link addWorkingDays}, but using UTC fields only).
 *
 * Example: 7 working days after 2026-07-17 (Fri) → 2026-07-28 (Tue).
 */
export function addUtcWorkingDays(startMs: number, workingDaysToAdd: number): number {
  if (workingDaysToAdd <= 0 || !Number.isFinite(workingDaysToAdd)) return startMs
  const d = new Date(startMs)
  let added = 0
  const target = Math.floor(workingDaysToAdd)
  while (added < target) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) added++
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Count Mon–Fri UTC calendar days in [startMs, endMs): same day grid as
 * {@link addUtcWorkingDays} (midnight UTC per date). Use for spans between ISO dates.
 */
export function countUtcWorkingDaysExclusiveEnd(
  startMs: number,
  endMs: number,
): number {
  if (endMs <= startMs) return 0
  let y = new Date(startMs).getUTCFullYear()
  let mo = new Date(startMs).getUTCMonth()
  let d = new Date(startMs).getUTCDate()
  let dayMs = Date.UTC(y, mo, d)
  const endDay = Date.UTC(
    new Date(endMs).getUTCFullYear(),
    new Date(endMs).getUTCMonth(),
    new Date(endMs).getUTCDate(),
  )
  let count = 0
  while (dayMs < endDay) {
    const wd = new Date(dayMs).getUTCDay()
    if (wd !== 0 && wd !== 6) count++
    dayMs += 86400000
  }
  return count
}
