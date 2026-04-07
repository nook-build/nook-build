'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { formatMoneyGBP } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import {
  addWorkingDaysIso,
  addUtcWorkingDays,
  countUtcWorkingDaysExclusiveEnd,
} from '@/lib/working-days'

const accent = '#F4A623'
const border = '#1E2535'
const surface = '#0F1219'

export type ProjectDetail = {
  id: string
  name: string | null
  address: string | null
  postcode: string | null
  contract_value: number | null
  /** Net approved variations vs original contract (+/-). */
  variations_total: number | null
  start_date: string | null
  handover_date: string | null
  status: string | null
  deposit_paid: boolean | null
  total_delays_days: number | null
  locked_items_count: number | null
}

export type PortalSection =
  | 'command-centre'
  | 'programme'
  | 'documents'
  | 'site-photos'
  | 'messages'
  | 'email-trail'
  | 'building-control'
  | 'invoices'
  | 'valuation'
  | 'cis'
  | 'task-board'
  | 'team-hub'
  | 'snag-list'
  | 'client-signoff'
  | 'handover-pack'
  | 'weekly-reports'

const ALL_PORTAL_SECTIONS: PortalSection[] = [
  'command-centre',
  'programme',
  'documents',
  'site-photos',
  'messages',
  'email-trail',
  'building-control',
  'invoices',
  'valuation',
  'cis',
  'task-board',
  'team-hub',
  'snag-list',
  'client-signoff',
  'handover-pack',
  'weekly-reports',
]

function renderPortalSection(
  section: PortalSection,
  project: ProjectDetail,
) {
  switch (section) {
    case 'command-centre':
      return <CommandCentrePanel project={project} />
    case 'programme':
      return <ProgrammeTab project={project} />
    case 'documents':
      return <DocumentsTab project={project} />
    case 'valuation':
      return <ValuationTab project={project} />
    case 'site-photos':
      return <PlaceholderPanel title="Site Photos" />
    case 'messages':
      return <MessagesTab project={project} />
    case 'email-trail':
      return <PlaceholderPanel title="Email Trail" />
    case 'building-control':
      return <PlaceholderPanel title="Building Control" />
    case 'invoices':
      return <PlaceholderPanel title="Invoices" />
    case 'cis':
      return <PlaceholderPanel title="CIS" />
    case 'task-board':
      return <PlaceholderPanel title="Task Board" />
    case 'team-hub':
      return <PlaceholderPanel title="Team Hub" />
    case 'snag-list':
      return <PlaceholderPanel title="Snag List" />
    case 'client-signoff':
      return <PlaceholderPanel title="Client Sign-Off" />
    case 'handover-pack':
      return <PlaceholderPanel title="Handover Pack" />
    case 'weekly-reports':
      return <PlaceholderPanel title="Weekly Reports" />
  }
}

const inputClass =
  'w-full rounded-lg border border-[#1E2535] bg-[#080A0F] px-3 py-2.5 text-sm text-[#E2E8F8] outline-none placeholder:text-[#475569] focus:border-[#F4A623]/50 [color-scheme:dark]'

type ValuationRecord = {
  id: string
  project_id: string
  week_label: string
  description: string | null
  contract_value: number | string | null
  /** This week % (DB column `percentage`). */
  percentage: number | string | null
  cumulative_percent: number | string | null
  /** This week £ (DB column `amount`). */
  amount: number | string
  cumulative_total: number | string
  status: string
  line_order: number
  created_at: string | null
}

type CertificateRecord = {
  id: string
  project_id: string
  certificate_number: string
  amount: number | string
  date_issued: string | null
  due_date: string | null
  date_paid: string | null
  status: string
}

type MessageRecord = {
  id: string
  project_id: string
  sender: string
  content: string
  created_at: string | null
}

type ProgrammeItemRecord = {
  id: string
  project_id: string
  trade_name: string
  phase: string
  start_week: number | string
  end_week: number | string
  percent_complete: number | string | null
  status: string | null
  colour: string | null
}

type ProgrammeSeed = {
  trade_name: string
  phase: string
  start_week: number
  end_week: number
  percent_complete: number
  status: string
  colour: string
}

type DelayLogEntry = {
  id: string
  startWeek: number
  /** Calendar / legacy display (weeks × 7 when unit weeks). */
  days: number
  /** Mon–Fri days for programme / handover (days = duration; weeks = duration × 5). */
  workingDays: number
  reason: string
  notes: string
  dateLogged: string
}

type VariationEntry = {
  id: string
  voNumber: string
  description: string
  trade: string
  value: number
  programmeDays: number
  status: 'pending' | 'approved' | 'rejected'
  dateRaised: string
  approvalDate: string
}

type BCInspection = {
  id: string
  inspectionType: string
  date: string
  inspectorName: string
  result: 'pass' | 'fail' | 'advisory' | null
  notes: string
  status: 'complete' | 'pending'
}

type SiteNoteEntry = {
  id: string
  week: number
  note: string
  status: 'on-track' | 'slightly-behind' | 'delayed' | 'paused' | 'ahead'
}

const PROGRAMME_SEED: ProgrammeSeed[] = [
  {
    phase: 'Phase 1 - Groundworks',
    trade_name: 'Demolition',
    start_week: 1,
    end_week: 2,
    percent_complete: 100,
    status: 'complete',
    colour: '#F4A623',
  },
  {
    phase: 'Phase 1 - Groundworks',
    trade_name: 'Foundation',
    start_week: 2,
    end_week: 5,
    percent_complete: 70,
    status: 'in_progress',
    colour: '#F4A623',
  },
  {
    phase: 'Phase 1 - Groundworks',
    trade_name: 'Drainage',
    start_week: 4,
    end_week: 6,
    percent_complete: 20,
    status: 'in_progress',
    colour: '#F4A623',
  },
  {
    phase: 'Phase 2 - Structure',
    trade_name: 'Walls',
    start_week: 6,
    end_week: 9,
    percent_complete: 0,
    status: 'not_started',
    colour: '#3B8BFF',
  },
  {
    phase: 'Phase 2 - Structure',
    trade_name: 'Beams',
    start_week: 8,
    end_week: 10,
    percent_complete: 0,
    status: 'not_started',
    colour: '#3B8BFF',
  },
  {
    phase: 'Phase 2 - Structure',
    trade_name: 'Roof',
    start_week: 10,
    end_week: 12,
    percent_complete: 0,
    status: 'not_started',
    colour: '#3B8BFF',
  },
  {
    phase: 'Phase 3 - Fit Out',
    trade_name: 'Windows',
    start_week: 11,
    end_week: 13,
    percent_complete: 0,
    status: 'not_started',
    colour: '#00BCD4',
  },
  {
    phase: 'Phase 3 - Fit Out',
    trade_name: 'Electrical',
    start_week: 12,
    end_week: 15,
    percent_complete: 0,
    status: 'not_started',
    colour: '#00BCD4',
  },
  {
    phase: 'Phase 3 - Fit Out',
    trade_name: 'Plumbing',
    start_week: 12,
    end_week: 15,
    percent_complete: 0,
    status: 'not_started',
    colour: '#00BCD4',
  },
  {
    phase: 'Phase 3 - Fit Out',
    trade_name: 'Plastering',
    start_week: 14,
    end_week: 17,
    percent_complete: 0,
    status: 'not_started',
    colour: '#00BCD4',
  },
  {
    phase: 'Phase 3 - Fit Out',
    trade_name: 'Flooring',
    start_week: 16,
    end_week: 18,
    percent_complete: 0,
    status: 'not_started',
    colour: '#00BCD4',
  },
]

function num(v: number | string | null | undefined) {
  if (v == null) return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

/** Maps legacy `week_number` (Aidan portal) to display week_label when `week_label` is absent. */
const VALUATION_WEEK_NUM_TO_LABEL: Record<number, string> = {
  1: '9 Mar 26 — 15 Mar 26',
  2: '16 Mar 26 — 22 Mar 26',
  3: '23 Mar 26 — 29 Mar 26',
  4: '30 Mar 26 — 5 Apr 26',
}

function normalizeValuationRow(raw: Record<string, unknown>): ValuationRecord {
  const weekNumber =
    raw.week_number != null && raw.week_number !== ''
      ? Number(raw.week_number)
      : null
  let weekLabel = ''
  if (typeof raw.week_label === 'string' && raw.week_label.trim() !== '') {
    weekLabel = raw.week_label
  } else if (
    weekNumber != null &&
    VALUATION_WEEK_NUM_TO_LABEL[weekNumber] != null
  ) {
    weekLabel = VALUATION_WEEK_NUM_TO_LABEL[weekNumber]
  } else if (weekNumber != null) {
    weekLabel = `Week ${weekNumber}`
  }
  const desc = (raw.description ?? raw.item_name ?? null) as string | null
  return {
    id: String(raw.id),
    project_id: String(raw.project_id),
    week_label: weekLabel,
    description: desc,
    contract_value: (raw.contract_value ?? null) as number | string | null,
    percentage: (raw.percentage ?? raw.percent_complete ?? null) as
      | number
      | string
      | null,
    cumulative_percent: (raw.cumulative_percent ?? null) as
      | number
      | string
      | null,
    amount: num(
      (raw.amount ?? raw.amount_due) as number | string | null | undefined,
    ),
    cumulative_total: num(
      raw.cumulative_total as number | string | null | undefined,
    ),
    status: String(raw.status ?? 'unpaid'),
    line_order: Number(raw.line_order ?? 0),
    created_at: (raw.created_at as string | null) ?? null,
  }
}

function normalizeValuationRows(
  rows: Record<string, unknown>[] | null | undefined,
): ValuationRecord[] {
  return (rows ?? []).map((r) => normalizeValuationRow(r))
}

function weekOptionsFromRows(rows: ValuationRecord[]): string[] {
  const latest = new Map<string, number>()
  for (const r of rows) {
    const t = r.created_at ? Date.parse(r.created_at) : 0
    const prev = latest.get(r.week_label) ?? 0
    if (t >= prev) latest.set(r.week_label, t)
  }
  return [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
}

/** Oldest → newest week labels for valuation navigation. */
function valuationChronologicalWeekLabels(rows: ValuationRecord[]): string[] {
  const byLabel = new Map<string, number>()
  for (const r of rows) {
    const t = r.created_at ? Date.parse(r.created_at) : 0
    const prev = byLabel.get(r.week_label)
    if (prev === undefined || t < prev) byLabel.set(r.week_label, t)
  }
  return [...byLabel.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([w]) => w)
}

function formatPortalWeekRangeFromStart(
  projectStartIso: string | null,
  weekOrdinal1Based: number,
): string {
  if (!projectStartIso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(projectStartIso.trim())
  if (!m) return '—'
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const start = base + (weekOrdinal1Based - 1) * 7 * 86400000
  const end = start + 6 * 86400000
  const fmt = (ms: number) => formatIsoDateDmy(new Date(ms).toISOString().slice(0, 10))
  return `${fmt(start)} – ${fmt(end)}`
}

function prevDrawnForTrade(
  rows: ValuationRecord[],
  tradeDesc: string,
  activeWeekLabel: string,
  chronWeeks: string[],
): number {
  const idx = chronWeeks.indexOf(activeWeekLabel)
  if (idx <= 0) return 0
  const d = tradeDesc.trim()
  let sum = 0
  for (let i = 0; i < idx; i++) {
    const wl = chronWeeks[i]
    for (const r of rows) {
      if (r.week_label !== wl) continue
      if ((r.description?.trim() ?? '') !== d) continue
      sum += num(r.amount)
    }
  }
  return sum
}

function weightedValuePercent(
  list: ValuationRecord[],
  getPct: (r: ValuationRecord) => number | null,
): number | null {
  let numerator = 0
  let denominator = 0
  for (const r of list) {
    const cv = num(r.contract_value)
    const p = getPct(r)
    if (cv > 0 && p != null) {
      numerator += cv * p
      denominator += cv
    }
  }
  if (denominator <= 0) return null
  return numerator / denominator
}

function pctThisWeek(r: ValuationRecord) {
  const p = r.percentage
  return p == null ? null : num(p)
}

function pctCumulative(r: ValuationRecord) {
  const p = r.cumulative_percent
  return p == null ? null : num(p)
}

function ValuationTab({ project }: { project: ProjectDetail }) {
  const [rows, setRows] = useState<ValuationRecord[]>([])
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [programmeItems, setProgrammeItems] = useState<
    { trade_name: string; phase: string }[]
  >([])
  const [approvedVariations, setApprovedVariations] = useState<
    { id: string; voNumber: string; description: string; trade: string; value: number }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingByRowId, setSavingByRowId] = useState<Record<string, boolean>>({})
  const [periodOverride, setPeriodOverride] = useState<string | null>(null)
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const lockStorageKey = `nook-valuation-locks:${project.id}`
  const [draftAmounts, setDraftAmounts] = useState<Record<string, number>>({})
  const [pctInputs, setPctInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const raw =
        typeof window !== 'undefined' ? localStorage.getItem(lockStorageKey) : null
      if (raw) setLockedIds(new Set(JSON.parse(raw) as string[]))
    } catch {
      /* ignore */
    }
  }, [lockStorageKey])

  useEffect(() => {
    let cancelled = false
    async function loadOnce() {
      setLoading(true)
      setError('')
      const [vRes, cRes, pRes, voRes] = await Promise.all([
        supabase
          .from('valuations')
          .select('*')
          .eq('project_id', project.id)
          .order('line_order', { ascending: true }),
        supabase
          .from('certificates')
          .select('*')
          .eq('project_id', project.id)
          .order('date_issued', { ascending: true }),
        supabase
          .from('programme_items')
          .select('trade_name, phase')
          .eq('project_id', project.id)
          .order('start_week', { ascending: true }),
        supabase
          .from('variations')
          .select('id, vo_number, description, trade, value, status')
          .eq('project_id', project.id),
      ])
      if (cancelled) return

      const errs = [
        vRes.error?.message,
        cRes.error?.message,
        pRes.error?.message,
        voRes.error?.message,
      ].filter(Boolean)
      if (errs.length > 0) setError(errs.join(' · '))

      setRows(normalizeValuationRows((vRes.data ?? []) as Record<string, unknown>[]))
      setCertificates((cRes.data ?? []) as CertificateRecord[])
      setProgrammeItems((pRes.data ?? []) as { trade_name: string; phase: string }[])

      const voRows = ((voRes.data ?? []) as Record<string, unknown>[]).filter(
        (v) => String(v.status ?? '').toLowerCase() === 'approved',
      )
      setApprovedVariations(
        voRows.map((v) => ({
          id: String(v.id ?? ''),
          voNumber: String(v.vo_number ?? '').trim() || 'VO',
          description: String(v.description ?? ''),
          trade: String(v.trade ?? '—'),
          value: num(v.value as number | string | null | undefined),
        })),
      )
      setLoading(false)
    }
    void loadOnce()
    return () => {
      cancelled = true
    }
  }, [])

  const chronWeeks = useMemo(() => valuationChronologicalWeekLabels(rows), [rows])
  const activePeriod = useMemo(() => {
    if (chronWeeks.length === 0) return null
    if (periodOverride && chronWeeks.includes(periodOverride)) return periodOverride
    return chronWeeks[chronWeeks.length - 1] ?? null
  }, [chronWeeks, periodOverride])

  const activeRows = useMemo(() => {
    if (!activePeriod) return []
    return rows
      .filter((r) => r.week_label === activePeriod)
      .sort((a, b) => a.line_order - b.line_order)
  }, [rows, activePeriod])

  useEffect(() => {
    if (loading || !activePeriod) return
    const nextPct: Record<string, string> = {}
    for (const r of rows) {
      if (r.week_label !== activePeriod) continue
      const p = pctThisWeek(r)
      nextPct[r.id] = p != null ? String(p) : '0'
    }
    setPctInputs(nextPct)
    setDraftAmounts({})
    // Omit `rows` from deps so saving one row does not reset other rows' drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activePeriod])

  const tradeToPhase = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of programmeItems) m.set(p.trade_name.trim().toLowerCase(), p.phase)
    return m
  }, [programmeItems])

  const phaseOrder = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const p of programmeItems) {
      if (!seen.has(p.phase)) {
        seen.add(p.phase)
        out.push(p.phase)
      }
    }
    return out
  }, [programmeItems])

  const phaseForDescription = useCallback(
    (desc: string | null) => tradeToPhase.get((desc ?? '').trim().toLowerCase()) ?? 'Other',
    [tradeToPhase],
  )

  const tableGroups = useMemo(() => {
    const grouped: { phase: string; rows: ValuationRecord[] }[] = []
    for (const ph of phaseOrder) {
      const inPhase = activeRows.filter((r) => phaseForDescription(r.description) === ph)
      if (inPhase.length > 0) grouped.push({ phase: ph, rows: inPhase })
    }
    const other = activeRows.filter((r) => phaseForDescription(r.description) === 'Other')
    if (other.length > 0) grouped.push({ phase: 'Other', rows: other })
    return grouped
  }, [activeRows, phaseForDescription, phaseOrder])

  const weekCertTotal = useMemo(
    () =>
      activeRows.reduce((s, r) => {
        const d = draftAmounts[r.id]
        return s + (d !== undefined ? d : num(r.amount))
      }, 0),
    [activeRows, draftAmounts],
  )

  const paidTotal = useMemo(
    () =>
      certificates.reduce(
        (s, c) =>
          (c.status ?? '').toLowerCase() === 'paid' || c.date_paid
            ? s + num(c.amount)
            : s,
        0,
      ),
    [certificates],
  )

  const outstandingTotal = useMemo(
    () =>
      certificates.reduce(
        (s, c) =>
          (c.status ?? '').toLowerCase() === 'paid' || c.date_paid
            ? s
            : s + num(c.amount),
        0,
      ),
    [certificates],
  )

  function persistLocks(next: Set<string>) {
    try {
      localStorage.setItem(lockStorageKey, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

  function handlePctChange(r: ValuationRecord, raw: string) {
    if (lockedIds.has(r.id)) return
    setPctInputs((prev) => ({ ...prev, [r.id]: raw }))
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed === '.' || trimmed === '-') {
      setDraftAmounts((d) => ({ ...d, [r.id]: 0 }))
      return
    }
    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed)) return
    const pct = Math.min(100, Math.max(0, parsed))
    const cv = num(r.contract_value)
    const amt = Math.round(((pct / 100) * cv) * 100) / 100
    setDraftAmounts((d) => ({ ...d, [r.id]: amt }))
  }

  async function savePctOnBlur(r: ValuationRecord, rawFromInput?: string) {
    if (lockedIds.has(r.id)) return
    const raw = (rawFromInput ?? pctInputs[r.id] ?? '0').trim()
    const parsed =
      raw === '' || raw === '.' || raw === '-' ? 0 : parseFloat(raw)
    const pct = Number.isNaN(parsed)
      ? 0
      : Math.min(100, Math.max(0, parsed))
    const cv = num(r.contract_value)
    const amt = Math.round(((pct / 100) * cv) * 100) / 100

    setSavingByRowId((s) => ({ ...s, [r.id]: true }))
    setRows((prev) =>
      prev.map((row) =>
        row.id === r.id ? { ...row, percentage: pct, amount: amt } : row,
      ),
    )
    const { error: saveErr } = await supabase
      .from('valuations')
      .update({ percentage: pct, amount: amt })
      .eq('id', r.id)
    setSavingByRowId((s) => ({ ...s, [r.id]: false }))
    if (saveErr) {
      setError(saveErr.message)
      return
    }
    setDraftAmounts((d) => {
      const next = { ...d }
      delete next[r.id]
      return next
    })
  }

  async function toggleLock(row: ValuationRecord) {
    const next = new Set(lockedIds)
    const willLock = !next.has(row.id)
    if (willLock) {
      next.add(row.id)
      const cv = num(row.contract_value)
      const prev = activePeriod
        ? prevDrawnForTrade(rows, row.description ?? '', activePeriod, chronWeeks)
        : 0
      const remaining = Math.max(0, cv - prev)
      const pct = cv > 0 ? (remaining / cv) * 100 : 0
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === row.id
            ? { ...r, status: 'paid', percentage: pct, amount: remaining }
            : r,
        ),
      )
      const { error: lockErr } = await supabase
        .from('valuations')
        .update({ status: 'paid', percentage: pct, amount: remaining })
        .eq('id', row.id)
      if (lockErr) setError(lockErr.message)
    } else {
      next.delete(row.id)
      setRows((prevRows) =>
        prevRows.map((r) => (r.id === row.id ? { ...r, status: 'unpaid' } : r)),
      )
      const { error: unlockErr } = await supabase
        .from('valuations')
        .update({ status: 'unpaid' })
        .eq('id', row.id)
      if (unlockErr) setError(unlockErr.message)
    }
    setLockedIds(next)
    persistLocks(next)
  }

  const weekIdx = activePeriod ? chronWeeks.indexOf(activePeriod) : -1
  const weekDisplay = `WEEK ${weekIdx >= 0 ? weekIdx + 1 : 1}`

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-lg border border-[#1E2535] bg-[#0F1219] px-4 py-3">
        <div className="text-sm text-[#94A3B8]">{weekDisplay}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-[#1E2535] px-2 py-1 text-xs text-[#E2E8F8]"
            onClick={() => {
              const idx = Math.max(0, chronWeeks.indexOf(activePeriod ?? '') - 1)
              setPeriodOverride(chronWeeks[idx] ?? null)
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded border border-[#1E2535] px-2 py-1 text-xs text-[#E2E8F8]"
            onClick={() => {
              const idx = Math.min(
                chronWeeks.length - 1,
                chronWeeks.indexOf(activePeriod ?? '') + 1,
              )
              setPeriodOverride(chronWeeks[idx] ?? null)
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto rounded-lg border border-[#1E2535] bg-[#0F1219]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#111622] text-xs uppercase text-[#94A3B8]">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Contract £</th>
                <th className="px-3 py-2 text-left">Prev Drawn £</th>
                <th className="px-3 py-2 text-left">Remaining £</th>
                <th className="px-3 py-2 text-left">Site Status</th>
                <th className="px-3 py-2 text-left">This Wk %</th>
                <th className="px-3 py-2 text-left">This Wk £</th>
                <th className="px-3 py-2 text-left">Claimed To Date £</th>
                <th className="px-3 py-2 text-left">Balance Left £</th>
                <th className="px-3 py-2 text-left">Lock</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-[#94A3B8]" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                tableGroups.map((group) => (
                  <Fragment key={group.phase}>
                    <tr>
                      <td
                        className="bg-[#0B0F17] px-3 py-2 font-semibold text-[#F4A623]"
                        colSpan={10}
                      >
                        {group.phase}
                      </td>
                    </tr>
                    {group.rows.map((r) => {
                      const cv = num(r.contract_value)
                      const prev = activePeriod
                        ? prevDrawnForTrade(rows, r.description ?? '', activePeriod, chronWeeks)
                        : 0
                      const thisWkPounds =
                        draftAmounts[r.id] !== undefined
                          ? draftAmounts[r.id]
                          : num(r.amount)
                      const claimed = prev + thisWkPounds
                      const bal = Math.max(0, cv - claimed)
                      const locked = lockedIds.has(r.id)
                      return (
                        <tr key={r.id} className="border-t border-[#1E2535] text-[#E2E8F8]">
                          <td className="px-3 py-2">{r.description ?? '—'}</td>
                          <td className="px-3 py-2">{formatMoneyGBP(cv)}</td>
                          <td className="px-3 py-2">{formatMoneyGBP(prev)}</td>
                          <td className="px-3 py-2">{formatMoneyGBP(Math.max(0, cv - prev))}</td>
                          <td className="px-3 py-2">
                            {(r.status ?? '').toLowerCase() === 'paid' ? 'Complete' : 'Active'}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              disabled={locked}
                              value={pctInputs[r.id] ?? ''}
                              onChange={(e) => handlePctChange(r, e.target.value)}
                              onBlur={(e) => void savePctOnBlur(r, e.target.value)}
                              className="w-[72px] rounded border border-[#F4A623] bg-[#1E2535] px-2 py-1 text-center text-xs text-[#F4A623] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {draftAmounts[r.id] !== undefined
                              ? formatMoneyGBP(draftAmounts[r.id])
                              : num(r.amount) > 0
                                ? formatMoneyGBP(num(r.amount))
                                : '—'}
                          </td>
                          <td className="px-3 py-2">{formatMoneyGBP(claimed)}</td>
                          <td className="px-3 py-2">{formatMoneyGBP(bal)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => void toggleLock(r)}
                              className="rounded border border-[#1E2535] px-2 py-1 text-xs"
                            >
                              {locked ? 'Locked' : 'Lock'}
                            </button>
                            {savingByRowId[r.id] ? (
                              <span className="ml-2 text-[10px] text-[#94A3B8]">Saving…</span>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 rounded-lg border border-[#1E2535] bg-[#0F1219] p-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Week Cert</div>
            <div className="text-2xl font-semibold text-[#F4A623]">
              {formatMoneyGBP(weekCertTotal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Paid To Date</div>
            <div className="text-lg text-[#E2E8F8]">{formatMoneyGBP(paidTotal)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#94A3B8]">
              Outstanding Certs
            </div>
            <div className="text-lg text-[#E2E8F8]">{formatMoneyGBP(outstandingTotal)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#1E2535] bg-[#0F1219] p-4">
        <div className="mb-2 text-sm font-semibold text-[#F4A623]">Variations</div>
        {approvedVariations.length === 0 ? (
          <div className="text-sm text-[#94A3B8]">No approved variations.</div>
        ) : (
          <div className="space-y-1 text-sm text-[#E2E8F8]">
            {approvedVariations.map((v) => (
              <div key={v.id} className="flex items-center justify-between border-b border-[#1E2535] py-1">
                <span>{v.voNumber} · {v.description || v.trade}</span>
                <span>{formatMoneyGBP(v.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#1E2535] bg-[#0F1219] p-4">
        <div className="mb-2 text-sm font-semibold text-[#F4A623]">Payment Tracker</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-[#94A3B8]">
              <tr>
                <th className="px-2 py-1 text-left">Certificate</th>
                <th className="px-2 py-1 text-left">Issued</th>
                <th className="px-2 py-1 text-left">Amount</th>
                <th className="px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id} className="border-t border-[#1E2535] text-[#E2E8F8]">
                  <td className="px-2 py-1">{c.certificate_number || '—'}</td>
                  <td className="px-2 py-1">{formatIsoDateDmy(c.date_issued)}</td>
                  <td className="px-2 py-1">{formatMoneyGBP(num(c.amount))}</td>
                  <td className="px-2 py-1">{c.status || '—'}</td>
                </tr>
              ))}
              {certificates.length === 0 ? (
                <tr>
                  <td className="px-2 py-2 text-[#94A3B8]" colSpan={4}>
                    No certificates yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function safeFileNameForStorage(name: string) {
  const base = name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_')
  return base.slice(0, 180) || 'file'
}

function formatFileSize(n: number | string | null | undefined) {
  if (n == null) return '—'
  const bytes = typeof n === 'string' ? parseInt(n, 10) : n
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentDownloadButton({
  storagePath,
  fileName,
}: {
  storagePath: string
  fileName: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function handleDownload() {
    setErr('')
    setBusy(true)
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 3600)
    setBusy(false)
    if (error || !data?.signedUrl) {
      setErr(error?.message ?? 'Could not create download link')
      return
    }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = fileName
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }
  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="text-sm font-medium transition hover:underline disabled:opacity-50"
        style={{ color: accent }}
      >
        {busy ? 'Preparing…' : 'Download'}
      </button>
      {err ? (
        <p className="mt-1 max-w-[200px] text-right text-xs text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  )
}

function DocumentsTab({ project }: { project: ProjectDetail }) {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [uploadFolder, setUploadFolder] = useState<DocumentFolder>('Contracts')
  const [filterFolder, setFilterFolder] = useState<DocumentFolder | 'all'>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [fileKey, setFileKey] = useState(0)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    setLoadErr('')
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (error) {
      setLoadErr(error.message)
      setDocs([])
    } else {
      setDocs((data ?? []) as DocumentRow[])
    }
    setLoading(false)
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setLoadErr('')
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        setLoadErr(error.message)
        setDocs([])
      } else {
        setDocs((data ?? []) as DocumentRow[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length }
    for (const f of DOCUMENT_FOLDERS) c[f] = 0
    for (const d of docs) {
      if (c[d.folder] != null) c[d.folder] += 1
    }
    return c as Record<DocumentFolder | 'all', number>
  }, [docs])

  const filteredDocs = useMemo(() => {
    if (filterFolder === 'all') return docs
    return docs.filter((d) => d.folder === filterFolder)
  }, [docs, filterFolder])

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploadErr('')
    const form = e.currentTarget
    const input = form.elements.namedItem('file') as HTMLInputElement
    const file = input?.files?.[0]
    if (!file) {
      setUploadErr('Choose a file to upload.')
      return
    }

    const objectId = crypto.randomUUID()
    const safe = safeFileNameForStorage(file.name)
    const storagePath = `${project.id}/${uploadFolder}/${objectId}_${safe}`

    setUploading(true)
    const { error: upErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })

    if (upErr) {
      setUploading(false)
      setUploadErr(upErr.message)
      return
    }

    const { error: rowErr } = await supabase.from('documents').insert({
      project_id: project.id,
      folder: uploadFolder,
      file_name: file.name,
      storage_path: storagePath,
      content_type: file.type || null,
      file_size: file.size,
    })

    setUploading(false)

    if (rowErr) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
      setUploadErr(rowErr.message)
      return
    }

    input.value = ''
    setFileKey((k) => k + 1)
    await loadDocs()
  }

  return (
    <div className="space-y-8">
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div
          className="absolute left-0 top-0 h-0.5 w-full opacity-90"
          style={{
            background: `linear-gradient(90deg, ${accent}, transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="p-5 sm:p-7">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
            PROJECT LIBRARY
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
            Documents
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            Organise uploads by folder. Files are stored securely; use Download
            to open a time-limited link.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterFolder('all')}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] ${
                filterFolder === 'all'
                  ? 'border-transparent text-black'
                  : 'border-[#1E2535] bg-[#080A0F] text-[#94A3B8] hover:border-[#2d3a52] hover:text-[#E2E8F8]'
              }`}
              style={
                filterFolder === 'all' ? { backgroundColor: accent } : undefined
              }
            >
              All
              <span className="ml-1.5 tabular-nums opacity-80">
                ({counts.all})
              </span>
            </button>
            {DOCUMENT_FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterFolder(f)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] ${
                  filterFolder === f
                    ? 'border-transparent text-black'
                    : 'border-[#1E2535] bg-[#080A0F] text-[#94A3B8] hover:border-[#2d3a52] hover:text-[#E2E8F8]'
                }`}
                style={
                  filterFolder === f ? { backgroundColor: accent } : undefined
                }
              >
                {f}
                <span className="ml-1.5 tabular-nums opacity-80">
                  ({counts[f]})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-5 sm:p-7"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
          Upload file
        </h3>
        <p className="mt-1 text-sm text-[#64748B]">
          Choose a folder, then select a file. Maximum practical size depends on
          your Supabase project limits.
        </p>
        <form className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={handleUpload}>
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <label
              htmlFor="doc-folder"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              FOLDER
            </label>
            <select
              id="doc-folder"
              value={uploadFolder}
              onChange={(e) =>
                setUploadFolder(e.target.value as DocumentFolder)
              }
              className={inputClass}
            >
              {DOCUMENT_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:min-w-[240px]">
            <label
              htmlFor={`doc-file-${fileKey}`}
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              FILE
            </label>
            <input
              key={fileKey}
              id={`doc-file-${fileKey}`}
              name="file"
              type="file"
              className={`${inputClass} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-[#1E2535] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#E2E8F8]`}
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] disabled:opacity-50 sm:shrink-0"
            style={{ backgroundColor: accent }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          {uploadErr ? (
            <p className="w-full text-sm text-red-400" role="alert">
              {uploadErr}
            </p>
          ) : null}
        </form>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div
          className="absolute left-0 top-0 h-0.5 w-full opacity-90"
          style={{
            background: `linear-gradient(90deg, ${accent}, transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="p-5 sm:p-7">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
            Uploaded documents
          </h3>

          {loadErr ? (
            <div
              className="mt-4 rounded-lg border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              Could not load documents: {loadErr}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8 text-center text-sm text-[#64748B]">
              Loading documents…
            </p>
          ) : !loadErr && filteredDocs.length === 0 ? (
            <div
              className="mt-6 rounded-lg border border-dashed px-6 py-14 text-center"
              style={{ borderColor: border, backgroundColor: '#080A0F' }}
            >
              <p className="text-sm text-[#94A3B8]">
                No documents in this view yet.
              </p>
              <p className="mt-2 text-sm text-[#64748B]">
                Upload a file above or switch folder filter.
              </p>
            </div>
          ) : !loadErr ? (
            <div className="mt-6 overflow-x-auto rounded-lg border border-[#1E2535]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]"
                    style={{
                      borderColor: border,
                      background:
                        'linear-gradient(180deg, #121722 0%, #0c0f16 100%)',
                    }}
                  >
                    <th className="px-4 py-3.5 pl-5">Name</th>
                    <th className="px-4 py-3.5">Folder</th>
                    <th className="hidden px-4 py-3.5 sm:table-cell">
                      Size
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5">Uploaded</th>
                    <th className="px-4 py-3.5 pr-5 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2535]">
                  {filteredDocs.map((d) => (
                    <tr
                      key={d.id}
                      className="transition-colors hover:bg-[#121722]/90"
                    >
                      <td className="max-w-[280px] px-4 py-3.5 pl-5">
                        <span className="font-medium text-[#F1F5F9]">
                          {d.file_name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#94A3B8]">
                        {d.folder}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3.5 tabular-nums text-[#64748B] sm:table-cell">
                        {formatFileSize(d.file_size)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#94A3B8]">
                        {formatInstantDmy(d.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 pr-5 text-right">
                        <DocumentDownloadButton
                          storagePath={d.storage_path}
                          fileName={d.file_name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function normalizeProgrammeItem(
  item: ProgrammeSeed | ProgrammeItemRecord,
): ProgrammeSeed {
  const start = Math.max(1, Math.round(num(item.start_week)))
  const end = Math.max(start, Math.round(num(item.end_week)))
  const pct = Math.min(100, Math.max(0, num(item.percent_complete)))
  const status =
    item.status ??
    (pct >= 100 ? 'complete' : pct > 0 ? 'in_progress' : 'not_started')
  return {
    phase: item.phase,
    trade_name: item.trade_name,
    start_week: start,
    end_week: end,
    percent_complete: pct,
    status,
    colour: item.colour ?? accent,
  }
}

type ProgrammeBarTone = {
  bg: string
  border: string
  prog: string
  text: string
}

function programmeBarTone(color: string): ProgrammeBarTone {
  const c = color.toUpperCase()
  const m = /^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/.exec(c)
  if (!m) {
    return {
      bg: 'rgba(100,110,130,.35)',
      border: 'rgba(100,110,130,.55)',
      prog: '#8899AA',
      text: '#8899AA',
    }
  }
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return {
    bg: `rgba(${r},${g},${b},.22)`,
    border: `rgba(${r},${g},${b},.45)`,
    prog: `#${m[1]}${m[2]}${m[3]}`,
    text: `#${m[1]}${m[2]}${m[3]}`,
  }
}

/** Trade-level Gantt colours matching the HTML portal categories. */
function programmeTradeTone(tradeName: string): ProgrammeBarTone {
  const t = tradeName.trim().toLowerCase()
  if (
    t.includes('drainage') ||
    t.includes('soakaway')
  ) return programmeBarTone('#92400E')
  if (
    t.includes('groundwork') ||
    t.includes('excavation') ||
    t.includes('foundation') ||
    t.includes('demolition') ||
    t.includes('lift hire') ||
    t.includes('site wc') ||
    t.includes('preparation')
  ) return programmeBarTone('#F4A623')
  if (
    t.includes('wall') ||
    t.includes('brick') ||
    t.includes('block') ||
    t.includes('cavity')
  ) return programmeBarTone('#3B8BFF')
  if (
    t.includes('steel') ||
    t.includes('beam') ||
    t.includes('structure')
  ) return programmeBarTone('#FF3D57')
  if (
    t.includes('roof') ||
    t.includes('grp') ||
    t.includes('insulation') ||
    t.includes('gutter')
  ) return programmeBarTone('#00E676')
  if (
    t.includes('glass') ||
    t.includes('balustrade')
  ) return programmeBarTone('#7DD3FC')
  if (
    t.includes('window') ||
    t === 'windows and doors'
  ) return programmeBarTone('#00BFA5')
  if (
    t.includes('electric') ||
    t.includes('electrical')
  ) return programmeBarTone('#FFD700')
  if (
    t.includes('plumb') ||
    t.includes('cylinder') ||
    t.includes('boiler')
  ) return programmeBarTone('#00BCD4')
  if (
    t.includes('plaster') ||
    t.includes('render')
  ) return programmeBarTone('#8B5CF6')
  if (
    t.includes('floor') ||
    t.includes('screed') ||
    t.includes('tile')
  ) return programmeBarTone('#FF6B9D')
  if (
    t.includes('skirting') ||
    t.includes('architrave') ||
    t.includes('carpentry') ||
    t.includes('internal door') ||
    t.includes('mdf')
  ) return programmeBarTone('#D4830A')
  if (
    t.includes('paint') ||
    t.includes('decorat')
  ) return programmeBarTone('#A3E635')
  if (t.includes('scaffold')) return programmeBarTone('#64748B')
  return programmeBarTone('#8899AA')
}

type ProgrammeScurveCanvasProps = {
  contract: number
  projectStartMs: number
  timelineEndMs: number
  /** UTC ms at start of each programme week (same order as Gantt). */
  weekMetaMs: number[]
  actualByPeriod: { dateMs: number; cumulative: number }[]
}

function ProgrammeScurveCanvas({
  contract,
  projectStartMs,
  timelineEndMs,
  weekMetaMs,
  actualByPeriod,
}: ProgrammeScurveCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      setCanvasWidth(Math.max(400, Math.floor(w)))
    })
    ro.observe(el)
    setCanvasWidth(Math.max(400, Math.floor(el.getBoundingClientRect().width)))
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const W = canvasWidth
    const H = 220
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    const pad = { t: 16, r: 16, b: 40, l: 60 }
    const cw = W - pad.l - pad.r
    const ch = H - pad.t - pad.b
    const ps = projectStartMs
    const pe = Math.max(timelineEndMs, projectStartMs + 86400000)
    const totalMs = pe - ps

    ctx.clearRect(0, 0, W, H)

    function dateX(ms: number) {
      const x = pad.l + ((ms - ps) / totalMs) * cw
      return Math.max(pad.l, Math.min(W - pad.r, x))
    }

    const maxV = contract > 0 ? contract : 1

    for (let i = 0; i <= 4; i += 1) {
      const y = pad.t + ch * (1 - i / 4)
      ctx.strokeStyle = 'rgba(30,37,53,.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(W - pad.r, y)
      ctx.stroke()
      ctx.fillStyle = '#4A5568'
      ctx.font = '9px DM Mono, monospace'
      ctx.textAlign = 'right'
      const tickVal = (contract * i) / 4
      const tickLabel =
        contract <= 0
          ? i === 0
            ? '£0'
            : ''
          : contract >= 1000
            ? `£${Math.round(tickVal / 1000)}k`
            : formatMoneyGBP(Math.round(tickVal))
      ctx.fillText(tickLabel, pad.l - 5, y + 3)
    }

    const span = Math.max(1, weekMetaMs.length - 1)
    for (let i = 0; i < weekMetaMs.length; i += 1) {
      const x = dateX(weekMetaMs[i])
      if (x < pad.l || x > W - pad.r) continue
      ctx.strokeStyle = 'rgba(30,37,53,.8)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, H - pad.b)
      ctx.stroke()
    }

    const s0 = 1 / (1 + Math.exp(5))
    const s1 = 1 / (1 + Math.exp(-5))
    const planPts: { x: number; y: number }[] = []
    for (let w = 0; w <= span; w += 1) {
      const t = span > 0 ? w / span : 0
      const s = 1 / (1 + Math.exp(-10 * (t - 0.5)))
      const v = ((s - s0) / (s1 - s0)) * maxV
      const idx = Math.min(w, Math.max(0, weekMetaMs.length - 1))
      const dMs = weekMetaMs[idx]
      planPts.push({
        x: dateX(dMs),
        y: pad.t + ch * (1 - v / maxV),
      })
    }
    ctx.strokeStyle = 'rgba(59,139,255,.35)'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    planPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
    ctx.setLineDash([])

    const actPts = actualByPeriod.map((p) => ({
      x: dateX(p.dateMs),
      y: pad.t + ch * (1 - p.cumulative / maxV),
      v: p.cumulative,
    }))
    const hasActual = actPts.some((p) => p.v > 0)
    if (hasActual) {
      const positive = actPts.filter((p) => p.v > 0)
      ctx.beginPath()
      const first = positive[0]
      if (first) {
        ctx.moveTo(first.x, H - pad.b)
        positive.forEach((p) => ctx.lineTo(p.x, p.y))
        const last = positive[positive.length - 1]
        ctx.lineTo(last.x, H - pad.b)
        ctx.closePath()
        ctx.fillStyle = 'rgba(244,166,35,.07)'
        ctx.fill()
      }
      ctx.strokeStyle = '#F4A623'
      ctx.lineWidth = 4
      ctx.beginPath()
      let started = false
      positive.forEach((p) => {
        if (!started) {
          ctx.moveTo(p.x, p.y)
          started = true
        } else ctx.lineTo(p.x, p.y)
      })
      ctx.stroke()

      positive.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#00E676'
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,.5)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    const todayMs = todayUtcMidnightMs()
    const todayX = dateX(todayMs)
    ctx.strokeStyle = '#FF3D57'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(todayX, pad.t)
    ctx.lineTo(todayX, H - pad.b)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#FF3D57'
    ctx.font = '9px DM Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('TODAY', todayX, pad.t - 2)

    const ly = H - pad.b + 18
    ctx.fillStyle = 'rgba(59,139,255,.4)'
    ctx.fillRect(pad.l, ly, 16, 3)
    ctx.fillStyle = '#4A5568'
    ctx.font = '9px DM Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('Planned S-curve', pad.l + 20, ly + 5)
    ctx.fillStyle = '#F4A623'
    ctx.fillRect(pad.l + 118, ly, 16, 3)
    ctx.fillText('Actual drawdown', pad.l + 138, ly + 5)
    ctx.fillStyle = '#FF3D57'
    ctx.fillRect(pad.l + 252, ly, 16, 3)
    ctx.fillText('Today', pad.l + 272, ly + 5)
  }, [
    canvasWidth,
    contract,
    projectStartMs,
    timelineEndMs,
    weekMetaMs,
    actualByPeriod,
  ])

  return (
    <div ref={wrapRef} className="relative h-[220px] w-full">
      <canvas ref={canvasRef} className="block h-[220px] w-full" />
    </div>
  )
}

function ProgrammeTab({ project }: { project: ProjectDetail }) {
  const [rows, setRows] = useState<ProgrammeSeed[]>(PROGRAMME_SEED)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [valuationRows, setValuationRows] = useState<ValuationRecord[]>([])
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [valuationLoadError, setValuationLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('programme_items')
        .select(
          'id, project_id, trade_name, phase, start_week, end_week, percent_complete, status, colour',
        )
        .eq('project_id', project.id)
        .order('start_week', { ascending: true })
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setRows(PROGRAMME_SEED)
      } else {
        const fetched = (data ?? []) as ProgrammeItemRecord[]
        setRows(
          fetched.length > 0
            ? fetched.map(normalizeProgrammeItem)
            : PROGRAMME_SEED.map(normalizeProgrammeItem),
        )
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    async function loadValuations() {
      setValuationLoadError('')
      const { data, error } = await supabase
        .from('valuations')
        .select('*')
        .eq('project_id', project.id)
        .order('line_order', { ascending: true })
      if (cancelled) return
      if (error) {
        setValuationLoadError(error.message)
        setValuationRows([])
      } else {
        setValuationRows(normalizeValuationRows(data as Record<string, unknown>[]))
      }
    }
    void loadValuations()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    async function loadCertificates() {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('project_id', project.id)
        .order('date_issued', { ascending: true })
      if (cancelled) return
      if (error) {
        setValuationLoadError(error.message)
        setCertificates([])
      } else {
        setCertificates((data ?? []) as CertificateRecord[])
      }
    }
    void loadCertificates()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const [programmeDelayWorkingDays, setProgrammeDelayWorkingDays] = useState(0)
  const [programmeVariationDays, setProgrammeVariationDays] = useState(0)
  const [programmeApprovedVariationsCount, setProgrammeApprovedVariationsCount] =
    useState(0)
  const [programmeImpactLoading, setProgrammeImpactLoading] = useState(true)
  const [programmeImpactError, setProgrammeImpactError] = useState('')
  const [approvedProgrammeVOs, setApprovedProgrammeVOs] = useState<
    {
      id: string
      voNumber: string
      description: string
      trade: string
      value: number
      progDays: number
    }[]
  >([])

  useEffect(() => {
    let cancelled = false
    async function loadProgrammeImpact() {
      setProgrammeImpactError('')
      const [delaysRes, varsRes] = await Promise.all([
        supabase
          .from('delays')
          .select('duration, unit')
          .eq('project_id', project.id),
        supabase
          .from('variations')
          .select(
            'id, vo_number, description, trade, value, prog_days, status',
          )
          .eq('project_id', project.id),
      ])
      if (cancelled) return
      const errs = [delaysRes.error?.message, varsRes.error?.message].filter(
        Boolean,
      )
      if (errs.length > 0) {
        setProgrammeImpactError(errs.join(' · '))
      }
      const delayRows = (delaysRes.data ?? []) as Record<string, unknown>[]
      console.log('[delays] raw programme impact rows', delayRows)
      const delayW = delayRows.reduce(
        (s, row) => s + delayRecordToWorkingDays(row),
        0,
      )
      setProgrammeDelayWorkingDays(delayW)

      const varRows = (varsRes.data ?? []) as Record<string, unknown>[]
      let vSum = 0
      let vCount = 0
      for (const row of varRows) {
        vSum += Math.max(0, Number(row.prog_days ?? 0))
        if (String(row.status ?? '').toLowerCase() === 'approved') {
          vCount += 1
        }
      }
      setProgrammeVariationDays(vSum)
      setProgrammeApprovedVariationsCount(vCount)
      const approved = (varsRes.data ?? []).filter(
        (row) =>
          String((row as Record<string, unknown>).status ?? '').toLowerCase() ===
          'approved',
      ) as Record<string, unknown>[]
      setApprovedProgrammeVOs(
        approved.map((row) => ({
          id: String(row.id ?? ''),
          voNumber: String(row.vo_number ?? '').trim() || 'VO',
          description: String(row.description ?? ''),
          trade: String(row.trade ?? '—'),
          value: Number(row.value ?? 0),
          progDays: Math.max(0, Number(row.prog_days ?? 0)),
        })),
      )
      setProgrammeImpactLoading(false)
    }
    void loadProgrammeImpact()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const [liveTick, setLiveTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLiveTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const minWeek = useMemo(
    () => Math.min(...rows.map((r) => r.start_week), 1),
    [rows],
  )
  const maxWeek = useMemo(
    () => Math.max(...rows.map((r) => r.end_week), 18),
    [rows],
  )
  const weekRange = useMemo(
    () => Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => i + minWeek),
    [minWeek, maxWeek],
  )

  const grouped = useMemo(() => {
    const m = new Map<string, ProgrammeSeed[]>()
    for (const r of rows) {
      if (!m.has(r.phase)) m.set(r.phase, [])
      m.get(r.phase)!.push(r)
    }
    return [...m.entries()]
  }, [rows])

  const projectStartMs = useMemo(() => {
    const parsed = utcMillisFromIsoDate(project.start_date)
    if (parsed != null) return parsed
    const now = new Date()
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  }, [project.start_date])

  const weekMeta = useMemo(() => {
    return weekRange.map((w) => {
      const idx = w - minWeek
      const ms = projectStartMs + idx * 7 * 86400000
      const d = new Date(ms)
      const month = d
        .toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
        .toUpperCase()
      return { week: w, month, date: d }
    })
  }, [weekRange, minWeek, projectStartMs])

  const monthSpans = useMemo(() => {
    if (weekMeta.length === 0) return []
    const spans: { month: string; start: number; span: number }[] = []
    let cur = weekMeta[0].month
    let start = 0
    for (let i = 1; i <= weekMeta.length; i += 1) {
      if (i === weekMeta.length || weekMeta[i].month !== cur) {
        spans.push({ month: cur, start, span: i - start })
        if (i < weekMeta.length) {
          cur = weekMeta[i].month
          start = i
        }
      }
    }
    return spans
  }, [weekMeta])

  const todayWeek = useMemo(() => {
    void liveTick
    const nowMs = todayUtcMidnightMs()
    const elapsedDays = (nowMs - projectStartMs) / 86400000
    return Math.max(1, Math.floor(elapsedDays / 7) + 1)
  }, [projectStartMs, liveTick])

  const todayLineLeftPct = useMemo(() => {
    if (weekRange.length === 0) return null
    const span = maxWeek - minWeek + 1
    if (span <= 0) return null
    const pos = ((todayWeek - minWeek + 0.5) / span) * 100
    return Math.max(0, Math.min(100, pos))
  }, [todayWeek, minWeek, maxWeek, weekRange.length])

  const delayDays = programmeDelayWorkingDays
  const variationDays = programmeVariationDays
  const variationsCount = programmeApprovedVariationsCount
  const totalProgrammeShift = delayDays + variationDays
  const revisedEndDate = useMemo(() => {
    if (!project.handover_date) return '—'
    const endMs = utcMillisFromIsoDate(project.handover_date)
    if (endMs == null) return '—'
    const shifted = addUtcWorkingDays(endMs, totalProgrammeShift)
    return formatIsoDateDmy(new Date(shifted).toISOString())
  }, [project.handover_date, totalProgrammeShift])

  const valuationWeekOpts = useMemo(
    () => weekOptionsFromRows(valuationRows),
    [valuationRows],
  )

  const latestValuationRows = useMemo(() => {
    const latest = valuationWeekOpts[0]
    if (!latest) return []
    return valuationRows
      .filter((r) => r.week_label === latest)
      .sort((a, b) => a.line_order - b.line_order)
  }, [valuationRows, valuationWeekOpts])

  const contractSum = useMemo(() => {
    const lineSum = latestValuationRows.reduce((s, r) => s + num(r.contract_value), 0)
    const projectCv =
      project.contract_value != null ? num(project.contract_value) : 0
    if (projectCv > 0) return projectCv
    if (lineSum > 0) return lineSum
    return 0
  }, [latestValuationRows, project.contract_value])

  const revisedContract = useMemo(
    () => (contractSum > 0 ? contractSum + num(project.variations_total) : 0),
    [contractSum, project.variations_total],
  )

  const actualByPeriod = useMemo(() => {
    const paid = certificates
      .filter(
        (c) =>
          (c.status ?? '').toLowerCase() === 'paid' || Boolean(c.date_paid),
      )
      .sort((a, b) =>
        (a.date_issued ?? '').localeCompare(b.date_issued ?? ''),
      )
    let cumul = 0
    return paid.map((c) => {
      cumul += num(c.amount)
      return {
        dateMs: c.date_issued
          ? Date.parse(`${c.date_issued}T12:00:00Z`)
          : todayUtcMidnightMs(),
        cumulative: cumul,
      }
    })
  }, [certificates])

  const totalCertified = useMemo(
    () =>
      certificates.reduce(
        (s, c) =>
          (c.status ?? '').toLowerCase() === 'paid' || c.date_paid
            ? s + num(c.amount)
            : s,
        0,
      ),
    [certificates],
  )

  const scurveContract = revisedContract > 0 ? revisedContract : contractSum

  const weekMetaMs = useMemo(
    () => weekMeta.map((w) => w.date.getTime()),
    [weekMeta],
  )

  const timelineEndMs = useMemo(() => {
    const handover = utcMillisFromIsoDate(project.handover_date)
    const shifted =
      handover != null
        ? addUtcWorkingDays(
            addUtcWorkingDays(handover, totalProgrammeShift),
            14,
          )
        : null
    const programmeEnd =
      weekMeta.length > 0
        ? projectStartMs + (maxWeek - minWeek + 1) * 7 * 86400000
        : projectStartMs + 18 * 7 * 86400000
    const lastPeriod =
      actualByPeriod.length > 0
        ? Math.max(...actualByPeriod.map((p) => p.dateMs))
        : 0
    const lastWeekMs =
      weekMetaMs.length > 0 ? weekMetaMs[weekMetaMs.length - 1] : programmeEnd
    return Math.max(
      shifted ?? programmeEnd,
      programmeEnd,
      lastWeekMs,
      lastPeriod,
      projectStartMs + 7 * 86400000,
    )
  }, [
    project.handover_date,
    projectStartMs,
    totalProgrammeShift,
    weekMeta.length,
    maxWeek,
    minWeek,
    actualByPeriod,
    weekMetaMs,
  ])

  const tradeLegend = useMemo(() => {
    const seen = new Set<string>()
    const out: { label: string; bg: string; border: string }[] = []
    for (const [phase, items] of grouped) {
      const first = items[0]
      if (!first || seen.has(phase)) continue
      seen.add(phase)
      const tone = programmeTradeTone(first.trade_name)
      out.push({ label: phase, bg: tone.bg, border: tone.border })
    }
    return out
  }, [grouped])

  const drawnLabel =
    scurveContract > 0 ? formatMoneyGBP(totalCertified) : '—'
  const remainingLabel =
    scurveContract > 0
      ? formatMoneyGBP(Math.max(0, scurveContract - totalCertified))
      : '—'

  return (
    <div className="pg" id="pg-programme">
      <div className="combined-wrap">
        <div className="combined-head">
          <div>
            <div className="pt">WORK PROGRAMME + CASHFLOW S-CURVE</div>
            <div className="ps">
              Gantt schedule above · S-curve cashflow below · Today marker live
            </div>
          </div>
          {loading ? <span className="mono-xs text-[#64748B]">Loading…</span> : null}
        </div>

        <div className="portal-live-panel" id="plp-programme">
          <div className="plp-title">Programme Impact Summary</div>
          <div className="portal-live-grid">
            <div className="plp-card warn">
              <div className="plp-label">Delay Days</div>
              <div className="plp-value" style={{ color: '#FF3D57' }}>
                {programmeImpactLoading ? '…' : delayDays}
              </div>
              <div className="plp-sub">Working days (Mon–Fri)</div>
            </div>
            <div className="plp-card warn">
              <div className="plp-label">Revised End Date</div>
              <div className="plp-value date">
                {programmeImpactLoading ? '…' : revisedEndDate}
              </div>
              <div className="plp-sub">
                Original: {formatIsoDateDmy(project.handover_date)}
              </div>
            </div>
            <div className="plp-card accent">
              <div className="plp-label">Variation Days</div>
              <div className="plp-value" style={{ color: '#F4A623' }}>
                {programmeImpactLoading ? '…' : variationDays}
              </div>
              <div className="plp-sub">Approved VO prog. days</div>
            </div>
            <div className="plp-card accent">
              <div className="plp-label">Variations Count</div>
              <div className="plp-value" style={{ color: '#F4A623' }}>
                {programmeImpactLoading ? '…' : variationsCount}
              </div>
              <div className="plp-sub">Approved variations</div>
            </div>
            <div className="plp-card">
              <div className="plp-label">Total Programme Shift</div>
              <div className="plp-value" style={{ color: '#3B8BFF' }}>
                {programmeImpactLoading ? '…' : `${totalProgrammeShift} days`}
              </div>
              <div className="plp-sub">Delays + variation days (working)</div>
            </div>
          </div>
          {programmeImpactError ? (
            <p className="mt-3 text-sm text-[#FF3D57]">
              Programme impact: {programmeImpactError}
            </p>
          ) : null}
          {loadError ? (
            <p className="mt-3 text-sm text-[#FF3D57]">
              Could not load programme_items: {loadError}. Showing defaults.
            </p>
          ) : null}
        </div>

        <div className="combined-body" id="gantt-combined">
          <div className="gantt-labels">
            <div className="gantt-label-head">Trade Item</div>
            {grouped.map(([phase, items]) => (
              <div key={`label-${phase}`}>
                <div className="gantt-label-row phase">
                  <span className="phase-text">{phase}</span>
                </div>
                {items.map((item) => {
                  const tone = programmeTradeTone(item.trade_name)
                  const letter = item.trade_name.slice(0, 1).toUpperCase()
                  const locked = item.percent_complete >= 100
                  return (
                    <div
                      key={`label-${phase}-${item.trade_name}`}
                      className={`gantt-label-row ${locked ? 'locked-row' : ''}`}
                    >
                      <span
                        className="label-type"
                        style={{
                          background: tone.bg,
                          color: tone.text,
                          border: `1px solid ${tone.border}`,
                        }}
                      >
                        {letter}
                      </span>
                      <span className="label-name" title={item.trade_name}>
                        {item.trade_name}
                      </span>
                      {locked ? (
                        <span className="locked-icon" aria-hidden>
                          🔒
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
            {approvedProgrammeVOs.length > 0 ? (
              <div key="gantt-variation-labels">
                <div className="gantt-label-row phase">
                  <span className="phase-text">VARIATIONS</span>
                </div>
                {approvedProgrammeVOs.map((v) => (
                  <div key={`vo-lbl-${v.id}`} className="gantt-label-row">
                    <span
                      className="label-type"
                      style={{
                        background: 'rgba(156,39,176,0.22)',
                        color: '#F3E5F5',
                        border: '1px solid #9C27B0',
                      }}
                    >
                      V
                    </span>
                    <span className="label-name" title={v.description}>
                      {v.voNumber} · {v.description}
                    </span>
                    <span
                      className="mono-xs"
                      style={{ color: '#CE93D8', marginLeft: 6, flexShrink: 0 }}
                    >
                      {v.trade}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="gantt-chart">
            <div className="chart-head">
              <div className="chart-head-inner">
                {monthSpans.map((m) => (
                  <div
                    key={`month-${m.month}-${m.start}`}
                    className="month-head"
                    style={{
                      left: `${(m.start / weekMeta.length) * 100}%`,
                    }}
                  >
                    {m.month}
                  </div>
                ))}
                {weekMeta.map((w, i) => (
                  <div
                    key={`line-${w.week}`}
                    className={`week-line ${i % 4 === 0 ? 'major' : ''}`}
                    style={{ left: `${(i / weekMeta.length) * 100}%` }}
                  />
                ))}
                {weekMeta.map((w, i) => (
                  <div
                    key={`wk-${w.week}`}
                    className={`wk-hdr ${w.week === todayWeek ? 'today-wk' : ''}`}
                    style={{ left: `${((i + 0.5) / weekMeta.length) * 100}%` }}
                  >
                    <div className="wk-num">W{w.week}</div>
                    <div className="wk-date">
                      {formatIsoDateDmy(w.date.toISOString().slice(0, 10))}
                    </div>
                  </div>
                ))}
                {todayLineLeftPct != null ? (
                  <div className="today-line" style={{ left: `${todayLineLeftPct}%` }} />
                ) : null}
              </div>
            </div>

            <div className="chart-rows">
              {todayLineLeftPct != null ? (
                <div className="today-line" style={{ left: `${todayLineLeftPct}%` }} />
              ) : null}
              {grouped.map(([phase, items]) => (
                <div key={`rows-${phase}`}>
                  <div className="chart-row phase-row" />
                  {items.map((item) => {
                    const tone = programmeTradeTone(item.trade_name)
                    const left = ((item.start_week - minWeek) / weekMeta.length) * 100
                    const width =
                      ((item.end_week - item.start_week + 1) / weekMeta.length) * 100
                    const progWidth = (width * Math.max(0, Math.min(100, item.percent_complete))) / 100
                    const locked = item.percent_complete >= 100
                    return (
                      <div
                        key={`bar-${phase}-${item.trade_name}`}
                        className={`chart-row ${locked ? 'locked-row' : ''}`}
                      >
                        <div
                          className="gbar"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: tone.bg,
                            border: `1px solid ${tone.border}`,
                          }}
                        />
                        <div
                          className="gbar-prog"
                          style={{
                            left: `${left}%`,
                            width: `${progWidth}%`,
                            background: tone.prog,
                          }}
                        />
                        <div className="gbar-text" style={{ left: `calc(${left}% + 6px)` }}>
                          {Math.round(item.percent_complete)}%
                        </div>
                        {locked ? (
                          <span className="chart-lock-icon" aria-hidden title="Complete">
                            🔒
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
              {approvedProgrammeVOs.length > 0 ? (
                <div key="gantt-variation-bars">
                  <div className="chart-row phase-row" />
                  {approvedProgrammeVOs.map((v) => {
                    const denom = Math.max(1, weekMeta.length)
                    const spanWeeks = Math.max(1, Math.ceil(v.progDays / 5))
                    const left =
                      Math.max(0, ((todayWeek - minWeek) / denom) * 100)
                    const width = Math.min(100, (spanWeeks / denom) * 100)
                    return (
                      <div key={`bar-vo-${v.id}`} className="chart-row">
                        <div
                          className="gbar"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: 'rgba(156,39,176,0.35)',
                            border: '1px solid #9C27B0',
                          }}
                        />
                        <div
                          className="gbar-text"
                          style={{
                            left: `calc(${left}% + 6px)`,
                            color: '#E1BEE7',
                          }}
                        >
                          {v.progDays}d
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="scurve-area">
          <div className="scurve-label">
            <div className="sc-ttl">S-CURVE</div>
            <div className="sc-sub">Cashflow drawdown</div>
            <div className="sc-drawn-block">
              <div className="sc-lbl">Drawn</div>
              <div className="sc-drawn-val">{drawnLabel}</div>
              <div className="sc-lbl sc-lbl-mt">Remaining</div>
              <div className="sc-remain-val">{remainingLabel}</div>
            </div>
          </div>
          <div className="scurve-canvas-wrap">
            {valuationLoadError ? (
              <p className="px-3 py-8 text-xs text-[#FF3D57]">
                Could not load valuations: {valuationLoadError}
              </p>
            ) : (
              <ProgrammeScurveCanvas
                contract={scurveContract}
                projectStartMs={projectStartMs}
                timelineEndMs={timelineEndMs}
                weekMetaMs={
                  weekMetaMs.length > 0 ? weekMetaMs : [projectStartMs]
                }
                actualByPeriod={actualByPeriod}
              />
            )}
          </div>
          {tradeLegend.length > 0 ? (
            <div className="prog-legend">
              {tradeLegend.map((t) => (
                <span key={t.label} className="prog-legend-item">
                  <span
                    className="prog-legend-dot"
                    style={{
                      background: t.bg,
                      border: `1px solid ${t.border}`,
                    }}
                  />
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .pg {
          color: #e2e8f8;
        }
        .combined-wrap {
          background: #0f1219;
          border: 1px solid #1e2535;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .combined-head {
          padding: 14px 20px;
          border-bottom: 1px solid #1e2535;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(244, 166, 35, 0.03);
        }
        .pt {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          color: #f4a623;
        }
        .ps {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #64748b;
        }
        .mono-xs {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
        }
        .portal-live-panel {
          margin: 14px 20px 0;
          background: #0f1219;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 12px;
        }
        .plp-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1.6px;
          color: #f8fafc;
          margin-bottom: 10px;
        }
        .portal-live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
        }
        .plp-card {
          background: #080a0f;
          border: 1px solid #1e2535;
          border-radius: 10px;
          padding: 10px;
        }
        .plp-card.warn {
          background: rgba(255, 61, 87, 0.05);
          border-color: rgba(255, 61, 87, 0.2);
        }
        .plp-card.accent {
          background: rgba(244, 166, 35, 0.05);
          border-color: rgba(244, 166, 35, 0.2);
        }
        .plp-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #64748b;
        }
        .plp-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 1px;
          line-height: 1;
          color: #e2e8f8;
          margin-top: 4px;
        }
        .plp-value.date {
          color: #ff3d57;
          font-size: 16px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.3px;
        }
        .plp-sub {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #64748b;
          margin-top: 3px;
        }
        .combined-body {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 600px;
        }
        .gantt-labels {
          border-right: 1px solid #1e2535;
          overflow: hidden;
        }
        .gantt-label-head {
          height: 50px;
          border-bottom: 1px solid #1e2535;
          background: #080a0f;
          display: flex;
          align-items: center;
          padding: 0 14px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #64748b;
        }
        .gantt-label-row {
          height: 36px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border-bottom: 1px solid rgba(30, 37, 53, 0.6);
          transition: background 0.1s;
          cursor: default;
          gap: 8px;
        }
        .gantt-label-row:hover {
          background: rgba(255, 255, 255, 0.012);
        }
        .gantt-label-row.phase {
          height: 26px;
          background: rgba(244, 166, 35, 0.1);
          border-bottom: 1px solid rgba(244, 166, 35, 0.22);
        }
        .gantt-label-row.locked-row {
          background: rgba(0, 230, 118, 0.03);
        }
        .phase-text {
          font-size: 9px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .label-name {
          font-size: 10px;
          color: #e2e8f8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .label-type {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          text-align: center;
          line-height: 20px;
          flex-shrink: 0;
        }
        .locked-icon {
          font-size: 11px;
          color: #00e676;
          flex-shrink: 0;
        }
        .gantt-chart {
          position: relative;
          overflow: hidden;
          background: #080a0f;
        }
        .chart-head {
          height: 50px;
          border-bottom: 1px solid #1e2535;
          background: #080a0f;
          position: relative;
          overflow: hidden;
        }
        .chart-head-inner {
          position: absolute;
          inset: 0;
        }
        .month-head {
          position: absolute;
          top: 4px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 13px;
          letter-spacing: 1px;
          color: #4a5568;
        }
        .chart-rows {
          position: relative;
          overflow-x: hidden;
          overflow-y: visible;
        }
        .chart-row {
          height: 36px;
          position: relative;
          border-bottom: 1px solid rgba(30, 37, 53, 0.6);
        }
        .chart-row.phase-row {
          height: 26px;
          background: rgba(244, 166, 35, 0.1);
          border-bottom: 1px solid rgba(244, 166, 35, 0.22);
        }
        .chart-row.locked-row {
          background: rgba(0, 230, 118, 0.02);
        }
        .gbar,
        .gbar-prog {
          position: absolute;
          height: 16px;
          top: 10px;
          border-radius: 4px;
        }
        .gbar {
          opacity: 0.85;
        }
        .gbar-prog {
          opacity: 1;
        }
        .gbar-text {
          position: absolute;
          top: 11px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: rgba(255, 255, 255, 0.95);
          z-index: 3;
          pointer-events: none;
          white-space: nowrap;
        }
        .chart-lock-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 4;
          font-size: 12px;
          line-height: 1;
          color: #00e676;
          pointer-events: none;
        }
        .week-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(30, 37, 53, 0.8);
          pointer-events: none;
        }
        .week-line.major {
          background: rgba(30, 37, 53, 1.5);
        }
        .today-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #ff3d57;
          opacity: 0.8;
          pointer-events: none;
          z-index: 10;
        }
        .wk-hdr {
          position: absolute;
          top: 20px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }
        .wk-num {
          font-family: 'DM Mono', monospace;
          font-size: 8px;
          color: #4a5568;
        }
        .wk-date {
          font-family: 'DM Mono', monospace;
          font-size: 8px;
          color: #64748b;
          opacity: 0.7;
        }
        .today-wk .wk-num {
          color: #ff3d57;
        }
        .scurve-area {
          border-top: 1px solid #1e2535;
          background: rgba(0, 0, 0, 0.3);
          display: grid;
          grid-template-columns: 240px 1fr;
          grid-template-rows: 220px auto;
        }
        .scurve-label {
          grid-column: 1;
          grid-row: 1;
          width: 240px;
          border-right: 1px solid #1e2535;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
        }
        .sc-ttl {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 2px;
          color: #f4a623;
        }
        .sc-sub {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
        }
        .sc-drawn-block {
          margin-top: 8px;
          text-align: center;
        }
        .sc-lbl {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #64748b;
        }
        .sc-lbl-mt {
          margin-top: 3px;
        }
        .sc-drawn-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          color: #00e676;
        }
        .sc-remain-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          color: #ff3d57;
        }
        .scurve-canvas-wrap {
          grid-column: 2;
          grid-row: 1;
          position: relative;
          min-height: 220px;
        }
        .prog-legend {
          grid-column: 1 / -1;
          grid-row: 2;
          padding: 8px 12px 12px;
          border-top: 1px solid rgba(30, 37, 53, 0.6);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #64748b;
        }
        .prog-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .prog-legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

function MessagesTab({ project }: { project: ProjectDetail }) {
  const [rows, setRows] = useState<MessageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [saving, setSaving] = useState(false)
  const [sender, setSender] = useState('Admin')
  const [content, setContent] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, project_id, sender, content, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setRows([])
      } else {
        setRows((data ?? []) as MessageRecord[])
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    const channel = supabase
      .channel(`project-messages:${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRecord
          setRows((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev
            return [...prev, incoming].sort(
              (a, b) =>
                Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''),
            )
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [project.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [rows.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    setSendError('')
    const senderName = sender.trim()
    const body = content.trim()
    if (!senderName) {
      setSendError('Sender name is required.')
      return
    }
    if (!body) {
      setSendError('Message cannot be empty.')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: project.id,
        sender: senderName,
        content: body,
        created_at: new Date().toISOString(),
      })
      .select('id, project_id, sender, content, created_at')
      .single()
    setSaving(false)

    if (error) {
      setSendError(error.message)
      return
    }

    if (data) {
      setRows((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data as MessageRecord]
      })
    }
    setContent('')
  }

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div
          className="absolute left-0 top-0 h-0.5 w-full opacity-90"
          style={{
            background: `linear-gradient(90deg, ${accent}, transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="p-5 sm:p-7">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
            PROJECT CHAT
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
            Messages
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            Real-time conversation between admin and client for this project.
          </p>

          <div
            className="mt-6 max-h-[420px] overflow-y-auto rounded-xl border p-4 sm:p-5"
            style={{ borderColor: border, backgroundColor: '#080A0F' }}
          >
            {loading ? (
              <p className="text-sm text-[#64748B]">Loading messages…</p>
            ) : loadError ? (
              <p className="text-sm text-[#FF3D57]" role="alert">
                Could not load messages: {loadError}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No messages yet</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((m) => {
                  const isAdmin = m.sender.toLowerCase().includes('admin')
                  return (
                    <li
                      key={m.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <article
                        className="max-w-[85%] rounded-2xl border px-3.5 py-3 shadow-sm sm:max-w-[75%]"
                        style={{
                          borderColor: isAdmin ? '#F4A62366' : border,
                          backgroundColor: isAdmin ? '#F4A62322' : '#1A1F2B',
                        }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                          {m.sender}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#E2E8F8]">
                          {m.content}
                        </p>
                        <p className="mt-2 text-right text-[11px] text-[#64748B]">
                          {formatInstantDmy(m.created_at)}
                        </p>
                      </article>
                    </li>
                  )
                })}
              </ul>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto]"
          >
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Sender (e.g. Admin)"
              className={inputClass}
              aria-label="Sender name"
            />
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message…"
              className={inputClass}
              aria-label="Message content"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {saving ? 'Sending…' : 'Send'}
            </button>
          </form>

          {sendError ? (
            <p className="mt-3 text-sm text-[#FF3D57]" role="alert">
              {sendError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function utcMillisFromIsoDate(iso: string | null | undefined): number | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function formatIsoDateDmy(iso: string | null | undefined): string {
  const ms = utcMillisFromIsoDate(iso)
  if (ms == null) return '—'
  const d = new Date(ms)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatInstantDmy(instant: string | null | undefined): string {
  if (!instant) return '—'
  const t = Date.parse(instant)
  if (!Number.isFinite(t)) return '—'
  const d = new Date(t)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function parseDmyToIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim())
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1000) return null
  const ms = Date.UTC(yyyy, mm - 1, dd)
  const d = new Date(ms)
  if (
    d.getUTCFullYear() !== yyyy ||
    d.getUTCMonth() + 1 !== mm ||
    d.getUTCDate() !== dd
  ) {
    return null
  }
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/** Delays table: unit days → duration as Mon–Fri days; weeks → duration × 5 working days. */
function delayRecordToWorkingDays(row: {
  duration?: unknown
  unit?: unknown
}): number {
  const duration = Math.max(0, Number(row.duration ?? 0))
  const unit = String(row.unit ?? 'days').toLowerCase()
  if (unit === 'weeks') return duration * 5
  return duration
}

function todayUtcMidnightMs(): number {
  const n = new Date()
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}

function timelinePercent(
  startIso: string | null,
  endIso: string | null,
): number | null {
  const startMs = utcMillisFromIsoDate(startIso)
  const endMs = utcMillisFromIsoDate(endIso)
  if (startMs == null || endMs == null) return null
  if (endMs <= startMs) return null
  const nowMs = todayUtcMidnightMs()
  const clamped = Math.min(Math.max(nowMs, startMs), endMs)
  const totalWd = countUtcWorkingDaysExclusiveEnd(startMs, endMs)
  if (totalWd <= 0) return null
  const doneWd = countUtcWorkingDaysExclusiveEnd(startMs, clamped)
  return (doneWd / totalWd) * 100
}

function weeksDurationBetween(
  startIso: string | null,
  endIso: string | null,
): number | null {
  const startMs = utcMillisFromIsoDate(startIso)
  const endMs = utcMillisFromIsoDate(endIso)
  if (startMs == null || endMs == null) return null
  if (endMs < startMs) return null
  const wd = countUtcWorkingDaysExclusiveEnd(startMs, endMs)
  return Math.max(0, Math.round(wd / 5))
}

function weeksUntilHandover(handoverIso: string | null): {
  weeks: number | null
  overdue: boolean
} {
  const endMs = utcMillisFromIsoDate(handoverIso)
  if (endMs == null) return { weeks: null, overdue: false }
  const nowMs = todayUtcMidnightMs()
  if (endMs < nowMs) return { weeks: 0, overdue: true }
  const wd = countUtcWorkingDaysExclusiveEnd(nowMs, endMs)
  const w = Math.ceil(wd / 5)
  return { weeks: w, overdue: false }
}

const SW14_7DF_LAT = 51.4669
const SW14_7DF_LON = -0.2739
const SW14_7DF_LABEL = 'SW14 7DF'

function wmoWeatherLabel(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Weather'
}

function formatSignedMoneyGBP(n: number): string {
  if (n === 0) return formatMoneyGBP(0)
  const abs = formatMoneyGBP(Math.abs(n))
  return n < 0 ? `−${abs}` : `+${abs}`
}

function CommandCentrePanel({ project }: { project: ProjectDetail }) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'programme'
    | 'valuation'
    | 'cumulative'
    | 'delays'
    | 'variations'
    | 'on-track'
    | 'building-control'
  >('overview')
  const [rows, setRows] = useState<ValuationRecord[]>([])
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [weather, setWeather] = useState<{
    loading: boolean
    error: string
    label: string
    temp: number | null
    code: number | null
    wind: number | null
    humidity: number | null
  }>({
    loading: false,
    error: '',
    label: '',
    temp: null,
    code: null,
    wind: null,
    humidity: null,
  })
  const [delayLogs, setDelayLogs] = useState<DelayLogEntry[]>([])
  const [delayDaysInput, setDelayDaysInput] = useState('1')
  const [delayUnit, setDelayUnit] = useState<'days' | 'weeks'>('days')
  const [delayStartWeekInput, setDelayStartWeekInput] = useState('3')
  const [delayReasonInput, setDelayReasonInput] = useState('Client delay')
  const [delayNotesInput, setDelayNotesInput] = useState('')
  const [siteNotes, setSiteNotes] = useState<SiteNoteEntry[]>([])
  const [siteNoteWeek, setSiteNoteWeek] = useState('1')
  const [siteNoteText, setSiteNoteText] = useState('')
  const [siteNoteStatus, setSiteNoteStatus] =
    useState<SiteNoteEntry['status']>('on-track')

  const [variationRows, setVariationRows] = useState<VariationEntry[]>([])
  const [varDesc, setVarDesc] = useState('')
  const [varTrade, setVarTrade] = useState('')
  const [varValue, setVarValue] = useState('')
  const [varDays, setVarDays] = useState('0')
  const [varStatus, setVarStatus] = useState<'pending' | 'approved' | 'rejected'>(
    'pending',
  )
  const [varDate, setVarDate] = useState('')
  const [varApprovalDate, setVarApprovalDate] = useState('')
  const [bcInspections, setBcInspections] = useState<BCInspection[]>([
    {
      id: crypto.randomUUID(),
      inspectionType: 'Commencement Notice',
      date: '2026-03-09',
      inspectorName: 'LBR - J. Smith BC1234',
      result: 'pass',
      notes: 'Commencement accepted',
      status: 'complete',
    },
    {
      id: crypto.randomUUID(),
      inspectionType: 'Excavations / Foundations',
      date: '2026-03-19',
      inspectorName: 'LBR - J. Smith BC1234',
      result: 'pass',
      notes: 'Strip foundations approved to spec',
      status: 'complete',
    },
    {
      id: crypto.randomUUID(),
      inspectionType: 'Drainage',
      date: '2026-03-25',
      inspectorName: 'LBR - J. Smith BC1234',
      result: 'pass',
      notes: 'Drainage run approved',
      status: 'complete',
    },
    {
      id: crypto.randomUUID(),
      inspectionType: 'Damp Proof Course (DPC)',
      date: '',
      inspectorName: '',
      result: null,
      notes: '',
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      inspectionType: 'Oversite / Concrete Slab',
      date: '',
      inspectorName: '',
      result: null,
      notes: '',
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      inspectionType: 'Structural Frame',
      date: '',
      inspectorName: '',
      result: null,
      notes: '',
      status: 'pending',
    },
  ])
  const [bcType, setBcType] = useState('')
  const [bcDate, setBcDate] = useState('')
  const [bcInspector, setBcInspector] = useState('')
  const [bcResult, setBcResult] = useState<'pass' | 'fail' | 'advisory'>('pass')
  const [bcNotes, setBcNotes] = useState('')
  const [overviewVariationsSum, setOverviewVariationsSum] = useState<
    number | null
  >(null)
  const [overviewApprovedVariationsSum, setOverviewApprovedVariationsSum] =
    useState<number | null>(null)
  const [overviewVariationsLoading, setOverviewVariationsLoading] =
    useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const [
        valuationsRes,
        certsRes,
        delaysRes,
        varsRes,
      ] = await Promise.all([
        supabase
          .from('valuations')
          .select('*')
          .eq('project_id', project.id)
          .order('line_order', { ascending: true }),
        supabase
          .from('certificates')
          .select('*')
          .eq('project_id', project.id)
          .order('date_issued', { ascending: true }),
        supabase
          .from('delays')
          .select('*')
          .eq('project_id', project.id)
          .order('date_logged', { ascending: true }),
        supabase
          .from('variations')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return
      const errors = [
        valuationsRes.error?.message,
        certsRes.error?.message,
        delaysRes.error?.message,
        varsRes.error?.message,
      ].filter(Boolean)
      if (errors.length > 0) {
        setLoadError(errors.join(' · '))
      }
      setRows(
        normalizeValuationRows(
          (valuationsRes.data ?? []) as Record<string, unknown>[],
        ),
      )
      setCertificates((certsRes.data ?? []) as CertificateRecord[])
      console.log(
        '[delays] raw command-centre rows',
        (delaysRes.data ?? []) as Record<string, unknown>[],
      )
      setDelayLogs(
        ((delaysRes.data ?? []) as Record<string, unknown>[]).map((d) => {
          const duration = Number(d.duration ?? 0)
          const unit = String(d.unit ?? 'days')
          const calendarDays = unit === 'weeks' ? duration * 7 : duration
          return {
            id: String(d.id ?? crypto.randomUUID()),
            startWeek: Number(d.start_week ?? 1),
            days: calendarDays,
            workingDays: delayRecordToWorkingDays({
              duration: d.duration,
              unit: d.unit,
            }),
            reason: String(d.reason ?? 'Other'),
            notes: String(d.notes ?? ''),
            dateLogged: String(d.date_logged ?? ''),
          }
        }),
      )
      setVariationRows(
        ((varsRes.data ?? []) as Record<string, unknown>[]).map((v, idx) => ({
          id: String(v.id ?? crypto.randomUUID()),
          voNumber:
            String(v.vo_number ?? '').trim() || `VO-${String(idx + 1).padStart(3, '0')}`,
          description: String(v.description ?? ''),
          trade: String(v.trade ?? '—'),
          value: Number(v.value ?? 0),
          programmeDays: Number(v.prog_days ?? 0),
          status:
            String(v.status ?? 'pending') === 'approved'
              ? 'approved'
              : String(v.status ?? 'pending') === 'rejected'
                ? 'rejected'
                : 'pending',
          dateRaised: String(v.date_raised ?? ''),
          approvalDate: String(v.client_approval_date ?? ''),
        })),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    if (activeTab !== 'overview') return
    let cancelled = false
    async function loadOverviewVariationsTotal() {
      setOverviewVariationsLoading(true)
      const { data, error } = await supabase
        .from('variations')
        .select('value, status')
        .eq('project_id', project.id)
      if (cancelled) return
      if (error) {
        setLoadError((prev) => (prev ? `${prev} · ${error.message}` : error.message))
        setOverviewVariationsSum(0)
        setOverviewApprovedVariationsSum(0)
        setOverviewVariationsLoading(false)
        return
      }
      let totalAll = 0
      let approvedOnly = 0
      for (const row of data ?? []) {
        const r = row as {
          value: string | number | null | undefined
          status?: string | null
        }
        const v = num(r.value)
        totalAll += v
        if (String(r.status ?? '').toLowerCase() === 'approved') {
          approvedOnly += v
        }
      }
      setOverviewVariationsSum(totalAll)
      setOverviewApprovedVariationsSum(approvedOnly)
      setOverviewVariationsLoading(false)
    }
    void loadOverviewVariationsTotal()
    return () => {
      cancelled = true
    }
  }, [activeTab, project.id])

  useEffect(() => {
    const ac = new AbortController()
    setWeather((w) => ({ ...w, loading: true, error: '' }))

    async function run() {
      try {
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${SW14_7DF_LAT}&longitude=${SW14_7DF_LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FLondon&forecast_days=1`,
          { signal: ac.signal },
        )
        if (!wxRes.ok) throw new Error('Weather request failed')
        const wx = (await wxRes.json()) as {
          current?: {
            temperature_2m?: number
            weather_code?: number
            wind_speed_10m?: number
            relative_humidity_2m?: number
          }
        }
        const cur = wx.current
        if (!cur) throw new Error('No current weather')

        setWeather({
          loading: false,
          error: '',
          label: SW14_7DF_LABEL,
          temp:
            typeof cur.temperature_2m === 'number'
              ? cur.temperature_2m
              : null,
          code:
            typeof cur.weather_code === 'number' ? cur.weather_code : null,
          wind:
            typeof cur.wind_speed_10m === 'number'
              ? cur.wind_speed_10m
              : null,
          humidity:
            typeof cur.relative_humidity_2m === 'number'
              ? cur.relative_humidity_2m
              : null,
        })
      } catch (e) {
        if (ac.signal.aborted) return
        setWeather({
          loading: false,
          error: e instanceof Error ? e.message : 'Weather unavailable',
          label: '',
          temp: null,
          code: null,
          wind: null,
          humidity: null,
        })
      }
    }

    void run()
    return () => ac.abort()
  }, [])

  const weekOpts = useMemo(() => weekOptionsFromRows(rows), [rows])
  const latestPeriod = weekOpts[0] ?? null
  const latestRows = useMemo(() => {
    if (!latestPeriod) return []
    return rows
      .filter((r) => r.week_label === latestPeriod)
      .sort((a, b) => a.line_order - b.line_order)
  }, [rows, latestPeriod])

  const contractSum = useMemo(() => {
    const lineSum = latestRows.reduce((s, r) => s + num(r.contract_value), 0)
    const projectCv =
      project.contract_value != null ? num(project.contract_value) : 0
    if (projectCv > 0) return projectCv
    if (lineSum > 0) return lineSum
    return 0
  }, [latestRows, project.contract_value])

  const variationTotal = useMemo(
    () =>
      variationRows.reduce(
        (s, v) => (v.status === 'rejected' ? s : s + v.value),
        0,
      ),
    [variationRows],
  )
  const revisedContract =
    contractSum > 0 ? contractSum + variationTotal : null

  const totalDrawn = useMemo(
    () =>
      certificates.reduce(
        (s, c) =>
          (c.status ?? '').toLowerCase() === 'paid' || c.date_paid
            ? s + num(c.amount)
            : s,
        0,
      ),
    [certificates],
  )

  const remaining =
    revisedContract != null && revisedContract > 0
      ? Math.max(0, revisedContract - totalDrawn)
      : null

  const totalDelayDays = useMemo(
    () => delayLogs.reduce((s, d) => s + (d.workingDays ?? 0), 0),
    [delayLogs],
  )
  const totalVariationDays = useMemo(
    () =>
      variationRows
        .reduce((s, v) => s + Math.max(0, Number(v.programmeDays ?? 0)), 0),
    [variationRows],
  )
  const totalHandoverWorkingShift = totalDelayDays + totalVariationDays
  const totalDelayWeeks = Math.round((totalDelayDays / 5) * 10) / 10

  const revisedHandoverIso = useMemo(() => {
    if (!project.handover_date) return null
    return addWorkingDaysIso(project.handover_date, totalHandoverWorkingShift)
  }, [project.handover_date, totalHandoverWorkingShift])

  const effectiveHandoverIso =
    revisedHandoverIso ?? project.handover_date ?? null

  const timelinePct = useMemo(
    () => timelinePercent(project.start_date, effectiveHandoverIso),
    [project.start_date, effectiveHandoverIso],
  )

  const paymentsPct =
    revisedContract != null && revisedContract > 0
      ? (totalDrawn / revisedContract) * 100
      : null

  const overviewRevisedContract = useMemo(() => {
    if (overviewApprovedVariationsSum == null) return null
    if (contractSum <= 0) return null
    return contractSum + overviewApprovedVariationsSum
  }, [contractSum, overviewApprovedVariationsSum])

  const overviewRemaining =
    overviewRevisedContract != null && overviewRevisedContract > 0
      ? Math.max(0, overviewRevisedContract - totalDrawn)
      : null

  const overviewPaymentsPct =
    overviewRevisedContract != null && overviewRevisedContract > 0
      ? (totalDrawn / overviewRevisedContract) * 100
      : null

  const durationWeeks = useMemo(
    () => weeksDurationBetween(project.start_date, effectiveHandoverIso),
    [project.start_date, effectiveHandoverIso],
  )

  const originalContract = project.contract_value
  const lockedItems = project.locked_items_count ?? 0

  const currentWeekDisplay = latestPeriod ?? '—'

  const chronologicalWeekLabels = useMemo(
    () => valuationChronologicalWeekLabels(rows),
    [rows],
  )
  const currentWeekNumber =
    latestPeriod && chronologicalWeekLabels.includes(latestPeriod)
      ? chronologicalWeekLabels.indexOf(latestPeriod) + 1
      : null
  const totalItems = useMemo(() => {
    return new Set(rows.map((r) => (r.description ?? '').trim()).filter(Boolean)).size
  }, [rows])
  const activeItems = latestRows.filter((r) => num(r.percentage) > 0).length
  const remainingItems = Math.max(0, totalItems - lockedItems)
  const completionByLockPct = totalItems > 0 ? (lockedItems / totalItems) * 100 : 0
  const timelineDonePct =
    durationWeeks != null && durationWeeks > 0 && currentWeekNumber != null
      ? Math.min(100, (currentWeekNumber / durationWeeks) * 100)
      : (timelinePct ?? 0)
  const weekOneLabel = chronologicalWeekLabels[0] ?? null
  const depositAmount = weekOneLabel
    ? rows
        .filter((r) => r.week_label === weekOneLabel)
        .reduce((s, r) => s + num(r.amount), 0)
    : 0

  const handoverWeeks = useMemo(
    () => weeksUntilHandover(revisedHandoverIso ?? project.handover_date),
    [revisedHandoverIso, project.handover_date],
  )

  const handoverStat =
    handoverWeeks.weeks == null
      ? '—'
      : handoverWeeks.overdue
        ? '0 (overdue)'
        : String(handoverWeeks.weeks)

  useEffect(() => {
    const delayDays = totalDelayDays
    const variationDays = totalVariationDays
    console.log('delay days from DB:', delayDays)
    console.log('variation prog days:', variationDays)
    console.log('total shift:', totalHandoverWorkingShift)
    console.log('original handover:', project.handover_date)
    console.log('revised handover:', revisedHandoverIso)
  }, [
    project.handover_date,
    totalDelayDays,
    totalVariationDays,
    totalHandoverWorkingShift,
    revisedHandoverIso,
  ])

  const revisedContractWithVars =
    (project.contract_value != null ? num(project.contract_value) : 0) + variationTotal

  const delayPreviewBase = Math.max(1, parseInt(delayDaysInput || '1', 10))
  const delayPreviewDays =
    delayUnit === 'weeks' ? delayPreviewBase * 5 : delayPreviewBase

  function fmtPortalDate(iso: string | null | undefined) {
    return formatIsoDateDmy(iso)
  }

  function fmtPortalDateUpper(iso: string | null | undefined) {
    return fmtPortalDate(iso).toUpperCase()
  }

  async function refreshVariationRowsFromDb() {
    const { data, error } = await supabase
      .from('variations')
      .select(
        'id, project_id, vo_number, description, trade, value, prog_days, status, date_raised, client_approval_date, created_at',
      )
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
      return
    }
    setVariationRows(
      ((data ?? []) as Record<string, unknown>[]).map((v, i) => ({
        id: String(v.id ?? crypto.randomUUID()),
        voNumber:
          String(v.vo_number ?? '').trim() || `VO-${String(i + 1).padStart(3, '0')}`,
        description: String(v.description ?? ''),
        trade: String(v.trade ?? '—'),
        value: Number(v.value ?? 0),
        programmeDays: Number(v.prog_days ?? 0),
        status:
          String(v.status ?? 'pending') === 'approved'
            ? 'approved'
            : String(v.status ?? 'pending') === 'rejected'
              ? 'rejected'
              : 'pending',
        dateRaised: String(v.date_raised ?? ''),
        approvalDate: String(v.client_approval_date ?? ''),
      })),
    )
  }

  async function addDelayLog(e: FormEvent) {
    e.preventDefault()
    const raw = Math.max(1, parseInt(delayDaysInput || '1', 10))
    const days = delayUnit === 'weeks' ? raw * 7 : raw
    const startW = Math.max(1, parseInt(delayStartWeekInput || '1', 10))
    const payload = {
      project_id: project.id,
      duration: raw,
      unit: delayUnit,
      start_week: startW,
      reason: delayReasonInput,
      notes: delayNotesInput.trim(),
      date_logged: new Date().toISOString().slice(0, 10),
    }
    console.log('[delays] inserting payload', payload)
    const { data, error } = await supabase
      .from('delays')
      .insert(payload)
      .select('*')
      .maybeSingle()
    if (error) {
      console.error('[delays] insert error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload,
      })
      setLoadError(error.message)
      return
    }
    console.log('[delays] insert success', data)
    const inserted = data as Record<string, unknown> | null
    if (inserted) {
      const calDays =
        String(inserted.unit ?? delayUnit) === 'weeks'
          ? Number(inserted.duration ?? raw) * 7
          : Number(inserted.duration ?? raw)
      setDelayLogs((prev) => [
        ...prev,
        {
          id: String(inserted.id ?? crypto.randomUUID()),
          startWeek: Number(inserted.start_week ?? startW),
          days: calDays,
          workingDays: delayRecordToWorkingDays({
            duration: inserted.duration,
            unit: inserted.unit,
          }),
          reason: String(inserted.reason ?? delayReasonInput),
          notes: String(inserted.notes ?? delayNotesInput.trim()),
          dateLogged: String(inserted.date_logged ?? payload.date_logged),
        },
      ])
    }
    setDelayDaysInput('1')
    setDelayUnit('days')
    setDelayStartWeekInput(String(currentWeekNumber ?? 1))
    setDelayReasonInput('Client delay')
    setDelayNotesInput('')
  }

  async function removeDelayLog(id: string) {
    const { error } = await supabase.from('delays').delete().eq('id', id)
    if (error) {
      setLoadError(error.message)
      return
    }
    setDelayLogs((prev) => prev.filter((d) => d.id !== id))
  }

  function addSiteNote() {
    if (!siteNoteText.trim()) return
    setSiteNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        week: Math.max(1, parseInt(siteNoteWeek || '1', 10)),
        note: siteNoteText.trim(),
        status: siteNoteStatus,
      },
    ])
    setSiteNoteText('')
    setSiteNoteStatus('on-track')
  }


  async function addVariation(e: FormEvent) {
    e.preventDefault()
    if (!varDesc.trim()) return
    const value = Math.max(0, parseFloat(varValue || '0'))
    const days = Math.max(0, parseInt(varDays || '0', 10))
    const dateRaisedIso = parseDmyToIso(varDate)
    const approvalIso = parseDmyToIso(varApprovalDate)
    if (varDate.trim() && !dateRaisedIso) {
      setLoadError('Date raised must be DD/MM/YYYY.')
      return
    }
    if (varApprovalDate.trim() && !approvalIso) {
      setLoadError('Client approval date must be DD/MM/YYYY.')
      return
    }
    const countRes = await supabase
      .from('variations')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    if (countRes.error) {
      setLoadError(countRes.error.message)
      return
    }
    const idx = (countRes.count ?? variationRows.length) + 1
    const voNumber = `VO-${String(idx).padStart(3, '0')}`
    const payload = {
      project_id: project.id,
      vo_number: voNumber,
      description: varDesc.trim(),
      trade: varTrade.trim() || '—',
      value,
      prog_days: days,
      status: varStatus,
      date_raised: dateRaisedIso ?? new Date().toISOString().slice(0, 10),
      client_approval_date: approvalIso,
      created_at: new Date().toISOString(),
    }
    const insertRes = await supabase
      .from('variations')
      .insert(payload)
    if (insertRes.error) {
      setLoadError(insertRes.error.message)
      return
    }
    await refreshVariationRowsFromDb()
    setVarDesc('')
    setVarTrade('')
    setVarValue('')
    setVarDays('0')
    setVarStatus('pending')
    setVarDate('')
    setVarApprovalDate('')
  }

  async function removeVariation(id: string) {
    const { error } = await supabase.from('variations').delete().eq('id', id)
    if (error) {
      setLoadError(error.message)
      return
    }
    await refreshVariationRowsFromDb()
  }

  const weeklyPlanRows = useMemo(() => {
    const labels = chronologicalWeekLabels
    const contract = revisedContract ?? contractSum
    let plannedCumul = 0
    let actualCumul = 0
    const paidCerts = certificates
      .filter((c) => (c.status ?? '').toLowerCase() === 'paid' || c.date_paid)
      .sort((a, b) => {
        const am = utcMillisFromIsoDate(a.date_issued) ?? 0
        const bm = utcMillisFromIsoDate(b.date_issued) ?? 0
        return am - bm
      })
    const certByWeekNumber = new Map<number, number>()
    paidCerts.forEach((c, i) => {
      const wk = i + 1
      certByWeekNumber.set(wk, (certByWeekNumber.get(wk) ?? 0) + num(c.amount))
    })
    return labels.map((wl, idx) => {
      const weekNum = idx + 1
      const weekPlanned = rows
        .filter((r) => r.week_label === wl)
        .reduce((s, r) => s + num(r.amount), 0)
      plannedCumul += weekPlanned
      const weekActual = certByWeekNumber.get(weekNum) ?? 0
      actualCumul += weekActual
      const actualPct = contract > 0 ? (actualCumul / contract) * 100 : 0
      const plannedPct = contract > 0 ? (plannedCumul / contract) * 100 : 0
      const variance = actualCumul - plannedCumul
      const current = currentWeekNumber === weekNum
      const status =
        weekActual > 0
          ? 'claimed'
          : current
            ? 'current'
            : weekNum > (currentWeekNumber ?? 0)
              ? 'pending'
              : 'pending'
      return {
        wl,
        weekNum,
        range: formatPortalWeekRangeFromStart(project.start_date, weekNum),
        weekPlanned,
        weekActual,
        plannedCumul,
        actualCumul,
        plannedPct,
        actualPct,
        variance,
        current,
        status,
      }
    })
  }, [
    certificates,
    chronologicalWeekLabels,
    contractSum,
    currentWeekNumber,
    project.start_date,
    revisedContract,
    rows,
  ])

  const bcComplete = bcInspections.filter((i) => i.status === 'complete').length
  const bcPending = bcInspections.filter((i) => i.status === 'pending').length
  const bcPass = bcInspections.filter((i) => i.result === 'pass').length
  const bcFail = bcInspections.filter((i) => i.result === 'fail').length
  const bcAdvisory = bcInspections.filter((i) => i.result === 'advisory').length

  function addInspection(e: FormEvent) {
    e.preventDefault()
    if (!bcType.trim()) return
    if (bcDate.trim() && !parseDmyToIso(bcDate)) {
      setLoadError('Inspection date must be DD/MM/YYYY.')
      return
    }
    setBcInspections((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        inspectionType: bcType.trim(),
        date: parseDmyToIso(bcDate) ?? '',
        inspectorName: bcInspector.trim(),
        result: bcResult,
        notes: bcNotes.trim(),
        status: 'complete',
      },
    ])
    setBcType('')
    setBcDate('')
    setBcInspector('')
    setBcResult('pass')
    setBcNotes('')
  }

  const topTabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'programme', label: 'PROGRAMME + S-CURVE' },
    { id: 'valuation', label: 'VALUATION & DRAWDOWN' },
    { id: 'cumulative', label: 'CUMULATIVE' },
    { id: 'delays', label: 'DELAYS & PAUSES' },
    { id: 'variations', label: 'VARIATIONS' },
    { id: 'on-track', label: 'ON TRACK' },
    { id: 'building-control', label: 'BUILDING CONTROL' },
  ] as const

  const overviewContent = (
    <div className="ov-root space-y-4" id="pg-overview">
      {loadError ? (
        <div
          className="rounded-lg border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Could not load valuations: {loadError}
        </div>
      ) : null}

      <div className="stats">
        <div className="sc a">
          <div className="sl">Contract Value</div>
          <div className="sv" style={{ color: 'var(--ac)' }}>
            {loading || overviewVariationsLoading || overviewApprovedVariationsSum == null
              ? '…'
              : contractSum > 0
                ? formatMoneyGBP(contractSum + overviewApprovedVariationsSum)
                : '—'}
          </div>
          {loading ||
          overviewVariationsLoading ||
          overviewApprovedVariationsSum == null ? (
            <div className="ss">…</div>
          ) : overviewApprovedVariationsSum > 0 ? (
            <div className="ss" style={{ color: 'var(--ac)' }}>
              incl. {formatMoneyGBP(overviewApprovedVariationsSum)} variations
            </div>
          ) : (
            <div className="ss">Revised contract</div>
          )}
        </div>
        <div className="sc g">
          <div className="sl">Total Drawn</div>
          <div className="sv" style={{ color: 'var(--gr)' }}>
            {loading ? '…' : formatMoneyGBP(totalDrawn)}
          </div>
          <div className="ss">
            {loading || overviewVariationsLoading
              ? '…'
              : overviewPaymentsPct != null
                ? `${overviewPaymentsPct.toFixed(1)}%`
                : '—'}
          </div>
        </div>
        <div className="sc b">
          <div className="sl">Remaining</div>
          <div className="sv" style={{ color: 'var(--bl)' }}>
            {loading || overviewVariationsLoading
              ? '…'
              : overviewRemaining != null
                ? formatMoneyGBP(overviewRemaining)
                : '—'}
          </div>
          <div className="ss">to draw</div>
        </div>
        <div className="sc p">
          <div className="sl">Items Locked</div>
          <div className="sv" style={{ color: 'var(--pu)' }}>
            {loading ? '…' : `${lockedItems} / ${totalItems || 44}`}
          </div>
          <div className="ss">complete</div>
        </div>
        <div className="sc t">
          <div className="sl">Current Week</div>
          <div className="sv" style={{ color: 'var(--tl)' }}>
            {loading ? '…' : currentWeekNumber != null ? `Wk ${currentWeekNumber}` : '—'}
          </div>
          <div className="ss">
            {durationWeeks != null && currentWeekNumber != null
              ? `of ${durationWeeks} weeks`
              : currentWeekDisplay}
          </div>
        </div>
        <div className="sc r">
          <div className="sl">Weeks to Handover</div>
          <div className="sv" style={{ color: 'var(--rd)' }}>
            {loading ? '…' : handoverStat}
          </div>
          <div className="ss">{formatIsoDateDmy(revisedHandoverIso ?? project.handover_date)}</div>
        </div>
      </div>

      <div className="batgrid">
        <div className="bc ba">
          <div className="btop">
            <div>
              <div className="blab">Schedule</div>
              <div className="bnam" style={{ color: 'var(--ac)' }}>TIMELINE</div>
            </div>
            <div className="bpct" style={{ color: 'var(--ac)' }}>
              {loading ? '…' : `${timelineDonePct.toFixed(0)}%`}
            </div>
          </div>
          <div className="btrack">
            <div className="bbar">
              <div className="bfill" style={{ width: `${Math.max(0, Math.min(100, timelineDonePct))}%`, background: 'linear-gradient(90deg,#B37200,#F4A623,#FFD080)' }} />
            </div>
            <div className="btick" />
          </div>
          <div className="bstats">
            <div className="bstat"><div className="bstat-l">Current Wk</div><div className="bstat-v" style={{ color: 'var(--ac)' }}>{currentWeekNumber ?? '—'}</div></div>
            <div className="bstat"><div className="bstat-l">Weeks Done</div><div className="bstat-v" style={{ color: 'var(--ac)' }}>{currentWeekNumber ?? '—'}</div></div>
            <div className="bstat"><div className="bstat-l">Weeks Left</div><div className="bstat-v" style={{ color: 'var(--rd)' }}>{handoverWeeks.weeks ?? '—'}</div></div>
          </div>
          <div className="split-row">
            <div className="split-cell"><div className="split-l">% DONE</div><div className="split-v" style={{ color: 'var(--ac)' }}>{timelineDonePct.toFixed(0)}%</div></div>
            <div className="split-sep" />
            <div className="split-cell"><div className="split-l">% LEFT</div><div className="split-v" style={{ color: 'var(--bl)' }}>{(100 - Math.max(0, Math.min(100, timelineDonePct))).toFixed(0)}%</div></div>
          </div>
        </div>

        <div className="bc bg">
          <div className="btop">
            <div><div className="blab">Payments</div><div className="bnam" style={{ color: 'var(--gr)' }}>DRAWN TO DATE</div></div>
            <div className="bpct" style={{ color: 'var(--gr)' }}>
              {loading || overviewVariationsLoading
                ? '…'
                : overviewPaymentsPct != null
                  ? `${overviewPaymentsPct.toFixed(0)}%`
                  : '—'}
            </div>
          </div>
          <div className="btrack">
            <div className="bbar">
              <div
                className="bfill"
                style={{
                  width: `${Math.max(0, Math.min(100, overviewPaymentsPct ?? 0))}%`,
                  background: 'linear-gradient(90deg,#007A6B,#00E676,#80FFB8)',
                }}
              />
            </div>
            <div className="btick" />
          </div>
          <div className="bstats">
            <div className="bstat"><div className="bstat-l">Drawn</div><div className="bstat-v" style={{ color: 'var(--gr)' }}>{formatMoneyGBP(totalDrawn).replace(',000','k')}</div></div>
            <div className="bstat"><div className="bstat-l">Contract</div><div className="bstat-v" style={{ color: 'var(--mu)' }}>{loading || overviewVariationsLoading ? '…' : overviewRevisedContract != null ? formatMoneyGBP(overviewRevisedContract).replace(',000','k') : '—'}</div></div>
            <div className="bstat"><div className="bstat-l">Remaining</div><div className="bstat-v" style={{ color: 'var(--rd)' }}>{loading || overviewVariationsLoading ? '…' : overviewRemaining != null ? formatMoneyGBP(overviewRemaining).replace(',000','k') : '—'}</div></div>
          </div>
          <div className="split-row">
            <div className="split-cell"><div className="split-l">% CLAIMED</div><div className="split-v" style={{ color: 'var(--gr)' }}>{loading || overviewVariationsLoading ? '…' : overviewPaymentsPct != null ? `${overviewPaymentsPct.toFixed(0)}%` : '—'}</div></div>
            <div className="split-sep" />
            <div className="split-cell"><div className="split-l">% LEFT</div><div className="split-v" style={{ color: 'var(--rd)' }}>{loading || overviewVariationsLoading ? '…' : overviewPaymentsPct != null ? `${(100 - Math.max(0, Math.min(100, overviewPaymentsPct))).toFixed(0)}%` : '—'}</div></div>
          </div>
        </div>

        <div className="bc bp">
          <div className="btop">
            <div><div className="blab">Completion</div><div className="bnam" style={{ color: 'var(--pu)' }}>BUILD PROGRESS</div></div>
            <div className="bpct" style={{ color: 'var(--pu)' }}>{`${completionByLockPct.toFixed(0)}%`}</div>
          </div>
          <div className="btrack">
            <div className="bbar">
              <div className="bfill" style={{ width: `${Math.max(0, Math.min(100, completionByLockPct))}%`, background: 'linear-gradient(90deg,#5B2FCF,#8B5CF6,#C4B5FD)' }} />
            </div>
            <div className="btick" />
          </div>
          <div className="bstats">
            <div className="bstat"><div className="bstat-l">Locked ✓</div><div className="bstat-v" style={{ color: 'var(--gr)' }}>{lockedItems}</div></div>
            <div className="bstat"><div className="bstat-l">Active</div><div className="bstat-v" style={{ color: 'var(--ac)' }}>{activeItems}</div></div>
            <div className="bstat"><div className="bstat-l">Remaining</div><div className="bstat-v" style={{ color: 'var(--mu)' }}>{remainingItems}</div></div>
          </div>
          <div className="split-row">
            <div className="split-cell"><div className="split-l">% COMPLETE</div><div className="split-v" style={{ color: 'var(--pu)' }}>{`${completionByLockPct.toFixed(0)}%`}</div></div>
            <div className="split-sep" />
            <div className="split-cell"><div className="split-l">% REMAINING</div><div className="split-v" style={{ color: 'var(--rd)' }}>{`${(100 - Math.max(0, Math.min(100, completionByLockPct))).toFixed(0)}%`}</div></div>
          </div>
        </div>
      </div>

      <div className="dates-row">
        <div><div className="d-l">Start</div><div className="d-v ac">{formatIsoDateDmy(project.start_date).toUpperCase()}</div></div>
        <div><div className="d-l">Handover</div><div className="d-v gr">{formatIsoDateDmy(revisedHandoverIso ?? project.handover_date).toUpperCase()}</div></div>
        <div><div className="d-l">Duration</div><div className="d-v bl">{durationWeeks != null ? `${durationWeeks} WEEKS` : '—'}</div></div>
        <div><div className="d-l">Deposit Paid</div><div className="d-v tl">{depositAmount > 0 ? formatMoneyGBP(depositAmount) : '—'}</div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel-lite">
          <div className="pl-head">LIVE WEATHER</div>
          {weather.loading ? (
            <div className="pl-sub">Loading weather…</div>
          ) : weather.error ? (
            <div className="pl-sub">{weather.error}</div>
          ) : (
            <>
              <div className="pl-main">{weather.temp != null ? `${Math.round(weather.temp)}°C` : '—'}</div>
              <div className="pl-sub">{weather.code != null ? wmoWeatherLabel(weather.code) : '—'} · {SW14_7DF_LABEL}</div>
            </>
          )}
        </div>
        <div className="panel-lite">
          <div className="pl-head">PROJECT SUMMARY</div>
          <div className="summary-row"><span>Original contract</span><strong>{originalContract != null ? formatMoneyGBP(num(originalContract)) : '—'}</strong></div>
          <div className="summary-row"><span>VARIATIONS TOTAL</span><strong>{overviewVariationsLoading ? '…' : formatSignedMoneyGBP(overviewVariationsSum ?? 0)}</strong></div>
          <div className="summary-row"><span>REVISED CONTRACT VALUE</span><strong>{overviewVariationsLoading ? '…' : overviewRevisedContract != null ? formatMoneyGBP(overviewRevisedContract) : '—'}</strong></div>
          <div className="summary-row no-b"><span>Total delays</span><strong>{`${totalDelayDays} day${totalDelayDays === 1 ? '' : 's'}`}</strong></div>
        </div>
      </div>

      <style jsx>{`
        .ov-root{--ac:#F4A623;--gr:#00E676;--rd:#FF3D57;--bl:#3B8BFF;--tl:#00BFA5;--pu:#8B5CF6;--mu:#4A5568;--bd:#1E2535;--s:#0F1219;--s2:#161B26;}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:2px;}
        .sc{background:var(--s);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;position:relative;overflow:hidden;}
        .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:12px 12px 0 0;}
        .sc.a::before{background:var(--ac)} .sc.g::before{background:var(--gr)} .sc.b::before{background:var(--bl)} .sc.r::before{background:var(--rd)} .sc.t::before{background:var(--tl)} .sc.p::before{background:var(--pu)}
        .sl{font-size:9px;font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-bottom:3px;}
        .sv{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;line-height:1;}
        .ss{font-size:9px;color:var(--mu);margin-top:2px;font-family:'DM Mono',monospace;}
        .batgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        .bc{background:var(--s);border:1px solid var(--bd);border-radius:14px;padding:16px;position:relative;overflow:hidden;}
        .bc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0;}
        .bc.ba::before{background:var(--ac)} .bc.bg::before{background:var(--gr)} .bc.bp::before{background:var(--pu)}
        .btop{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
        .blab{font-size:9px;font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-bottom:2px;}
        .bnam{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;line-height:1;}
        .bpct{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:1px;line-height:1;}
        .btrack{display:flex;align-items:center;gap:6px;margin-bottom:9px;}
        .bbar{flex:1;height:18px;background:var(--s2);border:1.5px solid var(--bd);border-radius:5px;position:relative;overflow:hidden;}
        .bfill{height:100%;border-radius:4px;position:relative;overflow:hidden;transition:width 1.2s cubic-bezier(.34,1.56,.64,1);}
        .bfill::after{content:'';position:absolute;top:0;left:-100%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:sh 2.5s infinite;}
        @keyframes sh{0%{left:-100%;}100%{left:100%;}}
        .btick{width:5px;height:10px;background:var(--bd);border-radius:0 3px 3px 0;flex-shrink:0;}
        .bstats{display:flex;gap:6px;}
        .bstat{flex:1;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:5px 8px;}
        .bstat-l{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);margin-bottom:1px;}
        .bstat-v{font-family:'Bebas Neue',sans-serif;font-size:16px;line-height:1;}
        .split-row{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--bd);}
        .split-cell{text-align:center;flex:1;}
        .split-l{font-family:'DM Mono',monospace;font-size:9px;color:var(--mu);margin-bottom:2px;}
        .split-v{font-family:'Bebas Neue',sans-serif;font-size:18px;}
        .split-sep{width:1px;background:var(--bd);}
        .dates-row{background:linear-gradient(135deg,rgba(244,166,35,.06),rgba(0,230,118,.03));border:1px solid rgba(244,166,35,.18);border-radius:12px;padding:16px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
        .d-l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-bottom:2px;}
        .d-v{font-family:'Bebas Neue',sans-serif;font-size:20px;}
        .d-v.ac{color:var(--ac)} .d-v.gr{color:var(--gr)} .d-v.bl{color:var(--bl)} .d-v.tl{color:var(--tl)}
        .panel-lite{background:var(--s);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;}
        .pl-head{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--mu);margin-bottom:8px;}
        .pl-main{font-family:'Bebas Neue',sans-serif;font-size:34px;color:#E2E8F8;line-height:1;}
        .pl-sub{font-size:12px;color:var(--mu);margin-top:4px;}
        .summary-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(30,37,53,.7);font-size:11px;color:var(--mu);}
        .summary-row strong{font-family:'Bebas Neue',sans-serif;font-size:16px;color:#E2E8F8;font-weight:400;}
        .summary-row.no-b{border-bottom:none;}
        @media (max-width:1200px){.stats{grid-template-columns:repeat(3,1fr);} .batgrid{grid-template-columns:1fr;} }
        @media (max-width:900px){.dates-row{grid-template-columns:repeat(2,1fr);} }
        @media (max-width:640px){.stats{grid-template-columns:repeat(2,1fr);} }
      `}</style>
    </div>
  )


  function CommandCentreCumulativeTab() {
    return (
      <div style={{ border: `1px solid ${border}`, borderRadius: 14, background: '#0F1219', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 2, color: '#E2E8F8' }}>CUMULATIVE</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>Weekly cumulative drawdown tracker</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['WEEK', 'DATES', 'WEEK CERT', 'CUMULATIVE', '% CONTRACT', 'PROGRESS', 'STATUS'].map((h) => (
                  <th key={h} style={{ background: '#161B26', color: '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyPlanRows.map((r) => (
                <tr key={r.weekNum} style={r.current ? { background: 'rgba(244,166,35,.04)' } : undefined}>
                  <td style={{ padding: '6px 10px', fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, letterSpacing: 1, color: r.current ? '#F4A623' : '#E2E8F8' }}>
                    WK{r.weekNum}
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{r.range}</td>
                  <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.weekActual > 0 ? '#F4A623' : '#64748B' }}>
                    {r.weekActual > 0 ? formatMoneyGBP(r.weekActual) : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00E676' }}>{formatMoneyGBP(r.actualCumul)}</td>
                  <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#E2E8F8' }}>{`${r.actualPct.toFixed(1)}%`}</td>
                  <td style={{ padding: '6px 10px', minWidth: 200 }}>
                    <div style={{ position: 'relative', height: 9, borderRadius: 999, background: '#1A2030', border: `1px solid ${border}`, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, r.plannedPct)}%`, background: 'rgba(59,139,255,.6)' }} />
                      <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, r.actualPct)}%`, background: 'rgba(244,166,35,.7)' }} />
                    </div>
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {r.status === 'claimed' ? (
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', color: '#00E676' }}>✓ Claimed</span>
                    ) : r.status === 'current' ? (
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(244,166,35,.1)', border: '1px solid rgba(244,166,35,.2)', color: '#F4A623' }}>▶ Current</span>
                    ) : (
                      <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(74,85,104,.2)', border: '1px solid rgba(74,85,104,.35)', color: '#94A3B8' }}>✗ Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '9px 10px', borderTop: `1px solid ${border}`, fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, letterSpacing: 1, color: '#F4A623' }}>TOTAL DRAWN</td>
                <td style={{ padding: '9px 10px', borderTop: `1px solid ${border}`, fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, color: '#00E676' }}>{formatMoneyGBP(totalDrawn)}</td>
                <td colSpan={3} style={{ borderTop: `1px solid ${border}` }} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  const programmeTabPanel = <ProgrammeTab project={project} />
  const valuationTabPanel = <ValuationTab project={project} />
  const cumulativeTabPanel = <CommandCentreCumulativeTab />
  const delaysTabPanel = (
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 14 }}>
          <div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, background: 'rgba(244,166,35,.03)' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 2 }}>PROGRAMME DELAY CONTROL</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    ['ORIGINAL HANDOVER', fmtPortalDateUpper(project.handover_date), '#64748B'],
                    ['REVISED HANDOVER', fmtPortalDateUpper(revisedHandoverIso ?? project.handover_date), '#F4A623'],
                    ['TOTAL DELAY WEEKS', String(totalDelayWeeks), '#FF3D57'],
                    ['PROGRAMME LENGTH', durationWeeks != null ? `${durationWeeks + Math.ceil(totalDelayDays / 7)} WKS` : '—', '#3B8BFF'],
                  ].map(([l, v, c]) => (
                    <div key={l}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#64748B', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 21, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={addDelayLog} style={{ background: '#161B26', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', display: 'block', marginBottom: 4 }}>DURATION</label>
                      <input type="number" min={1} max={365} value={delayDaysInput} onChange={(e) => setDelayDaysInput(e.target.value)} style={{ width: '100%', background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', display: 'block', marginBottom: 4 }}>UNIT</label>
                      <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 6, overflow: 'hidden' }}>
                        <button type="button" onClick={() => setDelayUnit('days')} style={{ flex: 1, border: 'none', padding: '7px 0', background: delayUnit === 'days' ? 'rgba(244,166,35,.15)' : '#0F1219', color: delayUnit === 'days' ? '#F4A623' : '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>Days</button>
                        <button type="button" onClick={() => setDelayUnit('weeks')} style={{ flex: 1, border: 'none', padding: '7px 0', background: delayUnit === 'weeks' ? 'rgba(244,166,35,.15)' : '#0F1219', color: delayUnit === 'weeks' ? '#F4A623' : '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>Weeks</button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', display: 'block', marginBottom: 4 }}>START WEEK</label>
                      <input type="number" min={1} max={52} value={delayStartWeekInput} onChange={(e) => setDelayStartWeekInput(e.target.value)} style={{ width: '100%', background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace', fontSize: 13 }} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(244,166,35,.05)', border: '1px solid rgba(244,166,35,.15)', borderRadius: 7, padding: '7px 12px', marginBottom: 10, fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#F4A623' }}>
                    = {delayPreviewDays} day{delayPreviewDays !== 1 ? 's' : ''} delay · Programme pushes forward {delayPreviewDays} day{delayPreviewDays !== 1 ? 's' : ''}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', display: 'block', marginBottom: 4 }}>REASON</label>
                    <select value={delayReasonInput} onChange={(e) => setDelayReasonInput(e.target.value)} style={{ width: '100%', background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontSize: 13 }}>
                      <option>Client delay</option><option>Material shortage</option><option>Weather / site conditions</option><option>Planning / approval hold</option><option>Contractor unavailable</option><option>Design change</option><option>Structural issue found</option><option>Other</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', display: 'block', marginBottom: 4 }}>NOTES</label>
                    <textarea value={delayNotesInput} onChange={(e) => setDelayNotesInput(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical', background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontSize: 13 }} />
                  </div>
                  <button type="submit" style={{ background: '#F4A623', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Log Delay</button>
                </form>
                <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 2 }}>WEEKLY SITE NOTES</div>
                  <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '120px 1fr 140px 100px', gap: 10, alignItems: 'end' }}>
                    <select value={siteNoteWeek} onChange={(e) => setSiteNoteWeek(e.target.value)} style={{ background: '#161B26', border: `1px solid ${border}`, borderRadius: 5, padding: '6px 8px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                      {Array.from({ length: Math.max(1, durationWeeks ?? 19) }).map((_, i) => <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>)}
                    </select>
                    <input value={siteNoteText} onChange={(e) => setSiteNoteText(e.target.value)} placeholder="What happened on site this week..." style={{ background: '#161B26', border: `1px solid ${border}`, borderRadius: 5, padding: '6px 10px', color: '#E2E8F8', fontSize: 13 }} />
                    <select value={siteNoteStatus} onChange={(e) => setSiteNoteStatus(e.target.value as SiteNoteEntry['status'])} style={{ background: '#161B26', border: `1px solid ${border}`, borderRadius: 5, padding: '6px 8px', color: '#E2E8F8', fontSize: 13 }}>
                      <option value="on-track">✅ On Track</option><option value="slightly-behind">⚠️ Slightly Behind</option><option value="delayed">🔴 Delayed</option><option value="paused">⏸️ Paused</option><option value="ahead">🚀 Ahead</option>
                    </select>
                    <button type="button" onClick={addSiteNote} style={{ background: '#F4A623', color: '#000', border: 'none', borderRadius: 6, padding: '7px 8px', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>+ Add Note</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>WEEK</th>
                        <th style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>NOTE / PROGRESS UPDATE</th>
                        <th style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteNotes.length === 0 ? (
                        <tr><td colSpan={3} style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>No notes yet. Add your first site note above.</td></tr>
                      ) : (
                        siteNotes.map((n) => (
                          <tr key={n.id}>
                            <td style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{`Week ${n.week}`}</td>
                            <td style={{ padding: '6px 8px', fontSize: 11 }}>{n.note}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: n.status === 'on-track' || n.status === 'ahead' ? '#00E676' : n.status === 'slightly-behind' ? '#F4A623' : '#FF3D57' }}>{n.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ background: 'rgba(255,61,87,.05)', border: '1px solid rgba(255,61,87,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', marginBottom: 4 }}>DAYS LOST</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#FF3D57' }}>{totalDelayDays}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', marginTop: 4 }}>Working days (Mon–Fri)</div>
            </div>
            <div style={{ background: 'rgba(0,230,118,.07)', border: '1px solid rgba(0,230,118,.2)', borderRadius: 9, padding: '9px 13px', marginBottom: 10, fontSize: 12, color: '#00E676', display: 'flex', gap: 8 }}>
              <span>✅</span>
              <span>{totalDelayDays === 0 ? `No delays logged. Programme on original schedule — handover ${fmtPortalDate(project.handover_date)}.` : `${totalDelayWeeks} week(s) of delays logged. Revised handover: ${fmtPortalDate(revisedHandoverIso)}.`}</span>
            </div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${border}`, fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 2 }}>DELAY LOG</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>DATE</th><th style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>REASON</th><th style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>WD</th><th style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B', textAlign: 'left' }}>IMPACT</th><th style={{ padding: '8px 10px' }} /></tr></thead>
                <tbody>
                  {delayLogs.length === 0 ? <tr><td colSpan={5} style={{ padding: '10px', color: '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>No delays logged yet.</td></tr> : delayLogs.map((d) => (
                    <tr key={d.id}>
                      <td style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{fmtPortalDate(d.dateLogged)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11 }}>{d.reason}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#FF3D57' }}>{d.workingDays}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>Wk {d.startWeek}</td>
                      <td style={{ padding: '8px 10px' }}><button type="button" onClick={() => void removeDelayLog(d.id)} style={{ border: '1px solid rgba(255,61,87,.3)', background: 'transparent', color: '#FF3D57', borderRadius: 4, fontSize: 10, padding: '2px 6px' }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
  const variationsTabPanel = (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              ['ORIGINAL CONTRACT', project.contract_value != null ? formatMoneyGBP(num(project.contract_value)) : '—', '#F4A623'],
              ['VARIATIONS TOTAL', formatMoneyGBP(variationTotal), '#00E676'],
              ['REVISED CONTRACT', project.contract_value != null ? formatMoneyGBP(revisedContractWithVars) : '—', '#3B8BFF'],
              ['VARIATIONS COUNT', String(variationRows.length), '#9C27B0'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, color: '#64748B' }}>{label}</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, background: 'rgba(244,166,35,.03)' }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 2 }}>VARIATION ORDERS</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <form onSubmit={addVariation} style={{ background: '#161B26', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, color: '#64748B', marginBottom: 10 }}>ADD NEW VARIATION ORDER</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 100px 110px', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                  <input type="text" placeholder="DESCRIPTION" value={varDesc} onChange={(e) => setVarDesc(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8' }} />
                  <input type="text" placeholder="TRADE / ITEM" value={varTrade} onChange={(e) => setVarTrade(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8' }} />
                  <input type="number" placeholder="VALUE £" min={0} value={varValue} onChange={(e) => setVarValue(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace' }} />
                  <input type="number" placeholder="PROG. DAYS" min={0} value={varDays} onChange={(e) => setVarDays(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace' }} />
                  <select value={varStatus} onChange={(e) => setVarStatus(e.target.value as 'pending' | 'approved' | 'rejected')} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 8px', color: '#E2E8F8', fontSize: 12 }}>
                    <option value="pending">⏳ Pending</option><option value="approved">✅ Approved</option><option value="rejected">❌ Rejected</option>
                  </select>
                  <button type="submit" style={{ background: '#F4A623', border: 'none', color: '#000', borderRadius: 6, padding: '7px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>+ Add VO</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="text" inputMode="numeric" placeholder="DD/MM/YYYY" value={varDate} onChange={(e) => setVarDate(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace' }} />
                  <input type="text" inputMode="numeric" placeholder="DD/MM/YYYY" value={varApprovalDate} onChange={(e) => setVarApprovalDate(e.target.value)} style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', color: '#E2E8F8', fontFamily: 'DM Mono, monospace' }} />
                </div>
              </form>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['VO #', 'DESCRIPTION', 'TRADE', 'DATE RAISED', 'VALUE £', 'PROG. DAYS', 'CLIENT APPROVAL', 'STATUS', 'ACTION'].map((h) => <th key={h} style={{ background: '#161B26', color: '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${border}` }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {variationRows.length === 0 ? <tr><td colSpan={9} style={{ padding: '14px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', textAlign: 'center' }}>No variations logged yet. Add your first VO above.</td></tr> : variationRows.map((v) => (
                      <tr key={v.id}>
                        <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace', color: '#F4A623' }}>{v.voNumber}</td>
                        <td style={{ padding: '7px 10px' }}>{v.description}</td>
                        <td style={{ padding: '7px 10px' }}>{v.trade}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace' }}>{fmtPortalDate(v.dateRaised)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace' }}>{formatMoneyGBP(v.value)}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace' }}>{v.programmeDays}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'DM Mono, monospace' }}>{v.approvalDate ? fmtPortalDate(v.approvalDate) : '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', background: v.status === 'approved' ? 'rgba(0,230,118,.1)' : v.status === 'rejected' ? 'rgba(255,61,87,.1)' : 'rgba(244,166,35,.1)', border: v.status === 'approved' ? '1px solid rgba(0,230,118,.2)' : v.status === 'rejected' ? '1px solid rgba(255,61,87,.2)' : '1px solid rgba(244,166,35,.2)', color: v.status === 'approved' ? '#00E676' : v.status === 'rejected' ? '#FF3D57' : '#F4A623' }}>{v.status}</span>
                        </td>
                        <td style={{ padding: '7px 10px' }}><button type="button" onClick={() => void removeVariation(v.id)} style={{ border: '1px solid rgba(255,61,87,.3)', background: 'transparent', color: '#FF3D57', borderRadius: 4, fontSize: 10, padding: '2px 6px' }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )
  const onTrackTabPanel = (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>WEEK</div><div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#F4A623' }}>{currentWeekDisplay.replace('Week ', 'Wk ')}</div></div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>PLANNED % DRAWN</div><div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22 }}>{weeklyPlanRows.find((w) => w.current)?.plannedPct.toFixed(1) ?? '0.0'}%</div></div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>ACTUAL % DRAWN</div><div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#00E676' }}>{weeklyPlanRows.find((w) => w.current)?.actualPct.toFixed(1) ?? '0.0'}%</div></div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>VARIANCE</div><div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#00E676' }}>{`+${((weeklyPlanRows.find((w) => w.current)?.actualPct ?? 0) - (weeklyPlanRows.find((w) => w.current)?.plannedPct ?? 0)).toFixed(1)}%`}</div></div>
            <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px' }}><div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>STATUS</div><div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#3B8BFF' }}>🚀 AHEAD</div></div>
          </div>
          <div style={{ marginBottom: 14, background: 'rgba(59,139,255,.08)', border: '1px solid rgba(59,139,255,.2)', color: '#3B8BFF', borderRadius: 9, padding: '9px 13px', fontSize: 12, display: 'flex', gap: 8 }}>
            <span>🚀</span><span>Ahead of programme. Keep the momentum!</span>
          </div>
          <div style={{ background: '#0F1219', border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, background: 'rgba(244,166,35,.03)' }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 2 }}>WEEK BY WEEK TRACKER</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['WEEK', 'DATES', 'PLANNED CERT', 'ACTUAL CERT', 'PLANNED CUMUL', 'ACTUAL CUMUL', 'VARIANCE £', 'SITE NOTE', 'STATUS'].map((h) => <th key={h} style={{ background: '#161B26', color: '#64748B', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${border}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {weeklyPlanRows.map((r) => (
                    <tr key={r.weekNum} style={r.current ? { background: 'rgba(244,166,35,.04)' } : undefined}>
                      <td style={{ padding: '6px 10px', fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, color: r.current ? '#F4A623' : '#64748B' }}>WK {r.weekNum}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{r.range}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{formatMoneyGBP(r.weekPlanned)}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.weekActual > 0 ? '#F4A623' : '#64748B' }}>{r.weekActual > 0 ? formatMoneyGBP(r.weekActual) : '—'}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{formatMoneyGBP(r.plannedCumul)}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00E676' }}>{formatMoneyGBP(r.actualCumul)}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.variance >= 0 ? '#00E676' : '#FF3D57' }}>{r.variance === 0 ? '—' : `${r.variance > 0 ? '+' : ''}${formatMoneyGBP(r.variance)}`}</td>
                      <td style={{ padding: '6px 10px', fontSize: 11, color: '#64748B' }}>{siteNotes.find((n) => n.week === r.weekNum)?.note ?? '—'}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {r.weekNum <= (currentWeekNumber ?? 0) ? <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(59,139,255,.08)', border: '1px solid rgba(59,139,255,.2)', color: '#3B8BFF' }}>🚀 Ahead</span> : <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#64748B' }}>Upcoming</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
  const buildingControlTabPanel = (
        <div className="space-y-4">
          <div className="stats" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
            <div className="sc g"><div className="sl">Passed</div><div className="sv" style={{ color: 'var(--gr)' }}>{bcPass}</div><div className="ss">inspections</div></div>
            <div className="sc r"><div className="sl">Failed</div><div className="sv" style={{ color: 'var(--rd)' }}>{bcFail}</div><div className="ss">inspections</div></div>
            <div className="sc a"><div className="sl">Advisory</div><div className="sv" style={{ color: 'var(--ac)' }}>{bcAdvisory}</div><div className="ss">inspections</div></div>
            <div className="sc b"><div className="sl">Complete</div><div className="sv" style={{ color: 'var(--bl)' }}>{bcComplete}</div><div className="ss">logged</div></div>
            <div className="sc t"><div className="sl">Pending</div><div className="sv" style={{ color: 'var(--tl)' }}>{bcPending}</div><div className="ss">awaiting</div></div>
          </div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="ph"><div><div className="pt">ADD INSPECTION</div><div className="ps">Log a new Building Control inspection</div></div></div>
            <form onSubmit={addInspection}>
              <div className="bc-form-row">
                <div>
                  <div className="sl" style={{ marginBottom: 5 }}>Inspection Type</div>
                  <input className="delay-input" value={bcType} onChange={(e) => setBcType(e.target.value)} placeholder="Select type..." />
                </div>
                <div>
                  <div className="sl" style={{ marginBottom: 5 }}>Inspection Date</div>
                  <input className="delay-input mono" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" value={bcDate} onChange={(e) => setBcDate(e.target.value)} />
                </div>
                <div>
                  <div className="sl" style={{ marginBottom: 5 }}>Inspector Name</div>
                  <input className="delay-input" value={bcInspector} onChange={(e) => setBcInspector(e.target.value)} placeholder="Name / Ref no." />
                </div>
                <div>
                  <div className="sl" style={{ marginBottom: 5 }}>Result</div>
                  <select className="delay-input" value={bcResult} onChange={(e) => setBcResult(e.target.value as 'pass' | 'fail' | 'advisory')}>
                    <option value="pass">✅ Pass</option>
                    <option value="fail">❌ Fail</option>
                    <option value="advisory">⚠️ Advisory</option>
                  </select>
                </div>
              </div>
              <div className="bc-form-row2">
                <div>
                  <div className="sl" style={{ marginBottom: 5 }}>Notes / Conditions</div>
                  <input className="delay-input" value={bcNotes} onChange={(e) => setBcNotes(e.target.value)} placeholder="Any conditions, actions required or notes..." />
                </div>
                <button className="btn btn-ac" type="submit" style={{ padding: '7px 20px', whiteSpace: 'nowrap' }}>+ Add Inspection</button>
              </div>
            </form>
          </div>
          <div className="panel">
            <div className="ph">
              <div><div className="pt">INSPECTION LOG</div><div className="ps">8 Deanhill Road · All Building Control inspections</div></div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--mu)', padding: '4px 8px', background: 'rgba(0,230,118,.08)', borderRadius: 4 }}>
                <span style={{ color: 'var(--gr)' }}>{bcComplete} / {bcInspections.length} complete</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Inspection Type', 'Date', 'Inspector', 'Result', 'Notes', 'Status'].map((h) => <th key={h} className="var-th">{h}</th>)}</tr></thead>
                <tbody>
                  {bcInspections.map((b) => (
                    <tr key={b.id}>
                      <td className="var-td">{b.inspectionType}</td>
                      <td className="var-td mono">{fmtPortalDate(b.date)}</td>
                      <td className="var-td">{b.inspectorName || '—'}</td>
                      <td className="var-td">
                        {b.result == null ? (
                          <span className="badge b-muted">pending</span>
                        ) : (
                          <span className={`badge ${b.result === 'pass' ? 'b-gr' : b.result === 'fail' ? 'b-rd' : 'b-ac'}`}>
                            {b.result}
                          </span>
                        )}
                      </td>
                      <td className="var-td">{b.notes || '—'}</td>
                      <td className="var-td">
                        <span className={`badge ${b.status === 'complete' ? 'b-gr' : 'b-ac'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border" style={{ borderColor: border, backgroundColor: surface }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-7" style={{ borderColor: border }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">NOOK BUILD</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
              COMMAND CENTRE
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#94A3B8] transition hover:text-[#E2E8F8]"
              style={{ borderColor: border, backgroundColor: '#080A0F' }}
            >
              Certificate
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#94A3B8] transition hover:text-[#E2E8F8]"
              style={{ borderColor: border, backgroundColor: '#080A0F' }}
            >
              Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border-b px-3 sm:px-5" style={{ borderColor: border, backgroundColor: '#080A0F' }}>
          <div className="flex min-w-max gap-5">
            {topTabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="relative py-3 font-mono text-[10px] uppercase tracking-[0.12em] transition"
                  style={{ color: active ? accent : '#64748B' }}
                >
                  {tab.label}
                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: accent }} />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
        {overviewContent}
      </div>
      <div style={{ display: activeTab === 'programme' ? 'block' : 'none' }}>
        {programmeTabPanel}
      </div>
      <div style={{ display: activeTab === 'valuation' ? 'block' : 'none' }}>
        {valuationTabPanel}
      </div>
      <div style={{ display: activeTab === 'cumulative' ? 'block' : 'none' }}>
        {cumulativeTabPanel}
      </div>
      <div style={{ display: activeTab === 'delays' ? 'block' : 'none' }}>
        {delaysTabPanel}
      </div>
      <div style={{ display: activeTab === 'variations' ? 'block' : 'none' }}>
        {variationsTabPanel}
      </div>
      <div style={{ display: activeTab === 'on-track' ? 'block' : 'none' }}>
        {onTrackTabPanel}
      </div>
      <div style={{ display: activeTab === 'building-control' ? 'block' : 'none' }}>
        {buildingControlTabPanel}
      </div>
      <style jsx>{`
        .panel {
          background: #0f1219;
          border: 1px solid #1e2535;
          border-radius: 16px;
          overflow: hidden;
        }
        .ph {
          padding: 12px 18px;
          border-bottom: 1px solid #1e2535;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(244, 166, 35, 0.03);
        }
        .pt {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          letter-spacing: 2px;
        }
        .ps {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #4a5568;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .sc {
          background: #0f1219;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 12px 14px;
          position: relative;
          overflow: hidden;
        }
        .sc::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
        }
        .sc.a::before { background: #f4a623; }
        .sc.g::before { background: #00e676; }
        .sc.b::before { background: #3b8bff; }
        .sc.p::before { background: #8b5cf6; }
        .sc.r::before { background: #ff3d57; }
        .sc.t::before { background: #00bfa5; }
        .sl {
          font-size: 9px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #4a5568;
          margin-bottom: 3px;
        }
        .sv {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          line-height: 1;
          letter-spacing: 1px;
        }
        .ss {
          margin-top: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #4a5568;
          text-transform: lowercase;
        }
        .delay-grid {
          padding: 18px 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .delay-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }
        .mini-lbl {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #4a5568;
        }
        .mini-val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
        }
        .mini-val.muted { color: #4a5568; }
        .mini-val.ac { color: #f4a623; }
        .mini-val.rd { color: #ff3d57; }
        .mini-val.bl { color: #3b8bff; }
        .delay-form-shell {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 10px;
          padding: 14px 16px;
        }
        .delay-form-row3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .delay-lbl {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #4a5568;
          display: block;
          margin-bottom: 4px;
        }
        .delay-input {
          width: 100%;
          background: #0f1219;
          border: 1px solid #1e2535;
          border-radius: 6px;
          padding: 7px 10px;
          color: #e2e8f8;
          font-size: 13px;
          outline: none;
        }
        .delay-input.mono {
          font-family: 'DM Mono', monospace;
        }
        .unit-row {
          display: flex;
          border: 1px solid #1e2535;
          border-radius: 6px;
          overflow: hidden;
        }
        .unit-btn {
          flex: 1;
          padding: 7px 0;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          border: none;
          background: #0f1219;
          color: #4a5568;
        }
        .unit-btn.unit-on {
          background: rgba(244, 166, 35, 0.15);
          color: #f4a623;
        }
        .delay-preview {
          background: rgba(244, 166, 35, 0.05);
          border: 1px solid rgba(244, 166, 35, 0.15);
          border-radius: 7px;
          padding: 7px 12px;
          margin-bottom: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #f4a623;
        }
        .delay-btn-row {
          display: flex;
          gap: 8px;
        }
        .impact-card {
          background: rgba(255, 61, 87, 0.05);
          border: 1px solid rgba(255, 61, 87, 0.2);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 12px;
        }
        .impact-days {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          color: #ff3d57;
        }
        .delay-log-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 280px;
          overflow-y: auto;
        }
        .delay-log-empty {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #4a5568;
          padding: 8px;
          background: #161b26;
          border-radius: 6px;
        }
        .delay-log-item {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .delay-log-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #e2e8f8;
        }
        .delay-log-meta {
          margin-top: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #4a5568;
        }
        .variation-form-shell {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }
        .variation-row {
          display: grid;
          grid-template-columns: 2fr 1fr 90px 90px 100px 110px;
          gap: 10px;
          align-items: end;
          margin-bottom: 10px;
        }
        .variation-note {
          margin-top: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #4a5568;
        }
        .bc-form-row {
          padding: 16px 18px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 12px;
          align-items: end;
        }
        .bc-form-row2 {
          padding: 0 18px 16px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: end;
        }
        .b-muted {
          background: rgba(74, 85, 104, 0.22);
          border: 1px solid rgba(74, 85, 104, 0.35);
          color: #94a3b8;
        }
        .var-th {
          background: #161b26;
          color: #4a5568;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #1e2535;
          white-space: nowrap;
        }
        .var-td {
          padding: 7px 10px;
          border-bottom: 1px solid rgba(30, 37, 53, 0.7);
          font-size: 11px;
        }
        .var-td.mono {
          font-family: 'DM Mono', monospace;
        }
        .var-td.ac {
          color: #f4a623;
        }
        .var-empty {
          padding: 14px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #4a5568;
          text-align: center;
        }
        .var-foot {
          padding: 9px 10px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          border-top: 1px solid #1e2535;
        }
        .var-foot.ac {
          color: #f4a623;
        }
        @media (max-width: 1100px) {
          .delay-grid {
            grid-template-columns: 1fr;
          }
          .variation-row {
            grid-template-columns: 1fr 1fr;
          }
          .bc-form-row {
            grid-template-columns: 1fr 1fr;
          }
          .bc-form-row2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed px-8 py-20 text-center sm:py-24"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}18, transparent)`,
        }}
        aria-hidden
      />
      <p className="relative text-base font-medium text-[#94A3B8]">{title}</p>
      <p className="relative mt-2 text-sm text-[#64748B]">
        Content for this section will appear here.
      </p>
    </div>
  )
}

export function ProjectTabs({
  project,
  activeSection,
}: {
  project: ProjectDetail
  activeSection: PortalSection
}) {
  const sectionNodes = useMemo(() => {
    const map = {} as Record<PortalSection, ReactNode>
    for (const section of ALL_PORTAL_SECTIONS) {
      map[section] = renderPortalSection(section, project)
    }
    return map
  }, [project.id])

  return (
    <div role="main" aria-live="polite">
      {ALL_PORTAL_SECTIONS.map((section) => (
        <div
          key={section}
          style={{ display: activeSection === section ? 'block' : 'none' }}
          aria-hidden={activeSection !== section}
        >
          {sectionNodes[section]}
        </div>
      ))}
    </div>
  )
}
