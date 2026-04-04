/** UK display context — fixed locale + timezone so SSR and browser match. */
const LOCALE = 'en-GB'
const DISPLAY_TZ = 'Europe/London'

const dateOnlyOpts: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}

const instantDateOpts: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: DISPLAY_TZ,
}

/**
 * Formats a calendar date stored as YYYY-MM-DD (project start_date, etc.).
 * Parsed as UTC midnight so the calendar day is never shifted by local TZ.
 */
export function formatIsoDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return '—'
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return '—'
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.toLocaleDateString(LOCALE, dateOnlyOpts)
}

/** Formats an ISO timestamp (e.g. created_at) for display in London time. */
export function formatInstantAsDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Date(t).toLocaleDateString(LOCALE, instantDateOpts)
}

export function formatMoneyGBP(n: number): string {
  return `£${n.toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function formatPercentDisplay(n: number): string {
  return `${n.toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}
