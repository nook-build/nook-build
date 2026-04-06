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
import {
  formatInstantAsDate,
  formatIsoDateOnly,
  formatMoneyGBP,
  formatPercentDisplay,
} from '@/lib/format'
import { supabase } from '@/lib/supabase'

const accent = '#F4A623'
const success = '#00E676'
const infoBlue = '#3B8BFF'
const cyan = '#00BCD4'
const danger = '#FF3D57'
const progressPurple = '#9C27B0'
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
  percent_complete: number | string | null
  cumulative_percent: number | string | null
  amount_due: number | string
  cumulative_total: number | string
  status: string
  line_order: number
  created_at: string | null
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
    percent_complete: (raw.percent_complete ?? raw.percentage ?? null) as
      | number
      | string
      | null,
    cumulative_percent: (raw.cumulative_percent ?? null) as
      | number
      | string
      | null,
    amount_due: num(
      (raw.amount_due ?? raw.amount) as number | string | null | undefined,
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

/** One valuation period (week_label) with summed certificate and sort key. */
function valuationPeriodsSorted(rows: ValuationRecord[]) {
  const byLabel = new Map<
    string,
    { cert: number; minCreated: number }
  >()
  for (const r of rows) {
    const prev = byLabel.get(r.week_label)
    const cert = num(r.amount_due)
    const created = r.created_at ? Date.parse(r.created_at) : NaN
    if (!prev) {
      byLabel.set(r.week_label, {
        cert,
        minCreated: Number.isFinite(created) ? created : 0,
      })
    } else {
      byLabel.set(r.week_label, {
        cert: prev.cert + cert,
        minCreated: Number.isFinite(created)
          ? Math.min(prev.minCreated, created)
          : prev.minCreated,
      })
    }
  }
  return [...byLabel.entries()]
    .map(([week_label, v]) => ({
      week_label,
      weekCert: v.cert,
      minCreated: v.minCreated,
    }))
    .sort((a, b) => {
      if (a.minCreated !== b.minCreated) return a.minCreated - b.minCreated
      return a.week_label.localeCompare(b.week_label)
    })
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
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    })
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
      sum += num(r.amount_due)
    }
  }
  return sum
}

function cumulativeCertThroughWeek(
  rows: ValuationRecord[],
  activeWeekLabel: string,
  chronWeeks: string[],
): number {
  const idx = chronWeeks.indexOf(activeWeekLabel)
  if (idx < 0) return 0
  let sum = 0
  for (let i = 0; i <= idx; i++) {
    const wl = chronWeeks[i]
    for (const r of rows) {
      if (r.week_label === wl) sum += num(r.amount_due)
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
  const p = r.percent_complete
  return p == null ? null : num(p)
}

function pctCumulative(r: ValuationRecord) {
  const p = r.cumulative_percent
  return p == null ? null : num(p)
}

function ValuationTab({ project }: { project: ProjectDetail }) {
  const [rows, setRows] = useState<ValuationRecord[]>([])
  const [programmeItems, setProgrammeItems] = useState<
    { trade_name: string; phase: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [periodOverride, setPeriodOverride] = useState<string | null>(null)
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => new Set())
  const lockStorageKey = `nook-valuation-locks:${project.id}`

  const [weekLabel, setWeekLabel] = useState('')
  const [description, setDescription] = useState('')
  const [contractValue, setContractValue] = useState(
    () => (project.contract_value != null ? String(project.contract_value) : ''),
  )
  const [percentThisWeekInput, setPercentThisWeekInput] = useState('')
  const [amountThisWeek, setAmountThisWeek] = useState('')
  const [cumulativePercentInput, setCumulativePercentInput] = useState('')
  const [lineStatus, setLineStatus] = useState<'paid' | 'unpaid'>('unpaid')

  useEffect(() => {
    try {
      const raw =
        typeof window !== 'undefined'
          ? localStorage.getItem(lockStorageKey)
          : null
      if (raw) {
        const arr = JSON.parse(raw) as string[]
        setLockedIds(new Set(arr))
      }
    } catch {
      /* ignore */
    }
  }, [lockStorageKey])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const { data, error } = await supabase
        .from('valuations')
        .select('*')
        .eq('project_id', project.id)
        .order('line_order', { ascending: true })

      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setRows([])
      } else {
        setRows(normalizeValuationRows(data as Record<string, unknown>[]))
      }

      const { data: pData } = await supabase
        .from('programme_items')
        .select('trade_name, phase')
        .eq('project_id', project.id)
        .order('start_week', { ascending: true })
      if (!cancelled && pData) {
        setProgrammeItems(pData as { trade_name: string; phase: string }[])
      }

      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const chronWeeks = useMemo(
    () => valuationChronologicalWeekLabels(rows),
    [rows],
  )

  const activePeriod = useMemo(() => {
    if (chronWeeks.length === 0) return null
    if (periodOverride && chronWeeks.includes(periodOverride)) {
      return periodOverride
    }
    return chronWeeks[chronWeeks.length - 1] ?? null
  }, [chronWeeks, periodOverride])

  const weekIdx = activePeriod ? chronWeeks.indexOf(activePeriod) : -1
  const weekOrdinal = weekIdx >= 0 ? weekIdx + 1 : 1
  const weekRangeStr = formatPortalWeekRangeFromStart(
    project.start_date,
    weekOrdinal,
  )
  const weekDisplayLine = `WEEK ${weekOrdinal} · ${weekRangeStr}`

  const filteredRows = useMemo(() => {
    if (!activePeriod) return []
    return rows
      .filter((r) => r.week_label === activePeriod)
      .sort((a, b) => a.line_order - b.line_order)
  }, [rows, activePeriod])

  const tradeToPhase = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of programmeItems) {
      m.set(p.trade_name.trim().toLowerCase(), p.phase)
    }
    return m
  }, [programmeItems])

  const phaseOrder = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of programmeItems) {
      if (!seen.has(p.phase)) {
        seen.add(p.phase)
        out.push(p.phase)
      }
    }
    return out
  }, [programmeItems])

  const phaseForDescription = useCallback(
    (desc: string | null): string => {
      const key = (desc ?? '').trim().toLowerCase()
      if (!key) return 'Other'
      return tradeToPhase.get(key) ?? 'Other'
    },
    [tradeToPhase],
  )

  const tableGroups = useMemo(() => {
    const groups: { phase: string; rows: ValuationRecord[] }[] = []
    for (const ph of phaseOrder) {
      const rs = filteredRows.filter((r) => phaseForDescription(r.description) === ph)
      if (rs.length > 0) groups.push({ phase: ph, rows: rs })
    }
    const other = filteredRows.filter(
      (r) => phaseForDescription(r.description) === 'Other',
    )
    if (other.length > 0) groups.push({ phase: 'Other', rows: other })
    return groups
  }, [filteredRows, phaseOrder, phaseForDescription])

  const { contractSum, paidToDate, thisWeekCertificate, outstanding } =
    useMemo(() => {
      const lineSum = filteredRows.reduce((s, r) => s + num(r.contract_value), 0)
      const projectCv =
        project.contract_value != null ? num(project.contract_value) : 0
      const contractSum =
        projectCv > 0 ? projectCv : lineSum > 0 ? lineSum : 0

      const paid = rows.reduce(
        (s, r) =>
          r.status.toLowerCase() === 'paid' ? s + num(r.amount_due) : s,
        0,
      )

      const thisWeekCertificate = filteredRows.reduce(
        (s, r) => s + num(r.amount_due),
        0,
      )

      const outstanding = Math.max(0, contractSum - paid)

      return {
        contractSum,
        paidToDate: paid,
        thisWeekCertificate,
        outstanding,
      }
    }, [filteredRows, rows, project.contract_value])

  const variationsTotal = num(project.variations_total)
  const revisedContract =
    contractSum > 0 ? contractSum + variationsTotal : contractSum

  const cumulativeDrawnThrough = useMemo(() => {
    if (!activePeriod) return 0
    return cumulativeCertThroughWeek(rows, activePeriod, chronWeeks)
  }, [rows, activePeriod, chronWeeks])

  const remainingVsCert = Math.max(0, revisedContract - cumulativeDrawnThrough)

  const drawPctOfContract =
    revisedContract > 0
      ? (cumulativeDrawnThrough / revisedContract) * 100
      : 0

  const totalWeeksProg = useMemo(() => {
    if (!project.start_date || !project.handover_date) {
      return Math.max(chronWeeks.length, 1)
    }
    const m1 = /^(\d{4})-(\d{2})-(\d{2})/.exec(project.start_date.trim())
    const m2 = /^(\d{4})-(\d{2})-(\d{2})/.exec(project.handover_date.trim())
    if (!m1 || !m2) return Math.max(chronWeeks.length, 1)
    const a = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]))
    const b = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]))
    const days = (b - a) / 86400000
    if (days < 0) return Math.max(chronWeeks.length, 1)
    return Math.max(1, Math.round(days / 7))
  }, [project.start_date, project.handover_date, chronWeeks.length])

  const progPct = Math.min(
    100,
    Math.round(((weekOrdinal || 1) / totalWeeksProg) * 1000) / 10,
  )

  const lockedCount = filteredRows.filter((r) => lockedIds.has(r.id)).length

  const itemsClaimedThisWeek = filteredRows.filter(
    (r) => num(r.amount_due) > 0,
  ).length

  const avgPctThisWeek = weightedValuePercent(filteredRows, pctThisWeek)

  const certBarPct =
    revisedContract > 0
      ? Math.min(100, (cumulativeDrawnThrough / revisedContract) * 100)
      : 0

  async function refetchRows() {
    const { data, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('project_id', project.id)
      .order('line_order', { ascending: true })
    if (!error && data) {
      setRows(normalizeValuationRows(data as Record<string, unknown>[]))
    }
  }

  function resolveWeekNumberForInsert(
    weekLabel: string,
    weeks: string[],
  ): number {
    const idx = weeks.indexOf(weekLabel)
    if (idx >= 0) return idx + 1
    for (const [n, lab] of Object.entries(VALUATION_WEEK_NUM_TO_LABEL)) {
      if (lab === weekLabel) return Number(n)
    }
    const m = /WEEK\s*(\d+)/i.exec(weekLabel)
    if (m) return Math.min(52, Math.max(1, parseInt(m[1], 10)))
    return Math.max(1, weeks.length + 1)
  }

  async function updateRowPct(r: ValuationRecord, pct: number) {
    const cv = num(r.contract_value)
    const amt = Math.round(((cv * pct) / 100) * 100) / 100
    const { error } = await supabase
      .from('valuations')
      .update({ percentage: pct, amount: amt })
      .eq('id', r.id)
    if (error) void error
    else void refetchRows()
  }

  function navigateWeek(delta: number) {
    if (chronWeeks.length === 0) return
    const idx = chronWeeks.indexOf(activePeriod ?? '')
    const n = Math.max(0, Math.min(chronWeeks.length - 1, idx + delta))
    setPeriodOverride(chronWeeks[n])
  }

  function persistLocks(next: Set<string>) {
    try {
      localStorage.setItem(lockStorageKey, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

  function toggleLock(id: string) {
    setLockedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (!confirm('Unlock this line? This allows further claims.')) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      persistLocks(next)
      return next
    })
  }

  async function handleAutoSuggest() {
    if (!activePeriod) return
    for (const r of filteredRows) {
      if (lockedIds.has(r.id)) continue
      const cv = num(r.contract_value)
      if (cv <= 0) continue
      const prev = prevDrawnForTrade(
        rows,
        r.description ?? '',
        activePeriod,
        chronWeeks,
      )
      const pctRem = Math.max(0, ((cv - prev) / cv) * 100)
      const sug = Math.min(25, Math.max(0, Math.round(pctRem * 0.2 * 10) / 10))
      await updateRowPct(r, sug)
    }
  }

  async function handleClearWeek() {
    if (!activePeriod) return
    if (typeof window !== 'undefined' && !confirm('Clear all entries for this week?')) return
    for (const r of filteredRows) {
      if (lockedIds.has(r.id)) continue
      await supabase
        .from('valuations')
        .update({ percentage: 0, amount: 0 })
        .eq('id', r.id)
    }
    void refetchRows()
  }

  function printCertificate() {
    if (typeof window !== 'undefined') window.print()
  }

  const totalContractCol = filteredRows.reduce(
    (s, r) => s + num(r.contract_value),
    0,
  )
  const totalPrevDrawn = filteredRows.reduce(
    (s, r) =>
      s +
      prevDrawnForTrade(
        rows,
        r.description ?? '',
        activePeriod ?? '',
        chronWeeks,
      ),
    0,
  )
  const totalRemaining = filteredRows.reduce((s, r) => {
    const cv = num(r.contract_value)
    const prev = prevDrawnForTrade(
      rows,
      r.description ?? '',
      activePeriod ?? '',
      chronWeeks,
    )
    return s + Math.max(0, cv - prev)
  }, 0)

  const totalBalanceLeft = filteredRows.reduce((s, r) => {
    const cv = num(r.contract_value)
    const cum = pctCumulative(r)
    const claimed =
      cum != null ? (cv * cum) / 100 : prevDrawnForTrade(
          rows,
          r.description ?? '',
          activePeriod ?? '',
          chronWeeks,
        ) + num(r.amount_due)
    return s + Math.max(0, cv - claimed)
  }, 0)

  const footerClaimedPct =
    revisedContract > 0 ? (cumulativeDrawnThrough / revisedContract) * 100 : 0

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!weekLabel.trim()) {
      setFormError('Valuation period (week) is required.')
      return
    }

    const amount = parseFloat(amountThisWeek)
    if (Number.isNaN(amount)) {
      setFormError('Enter a valid amount for this week.')
      return
    }

    let contractNum: number | null = null
    if (contractValue.trim()) {
      contractNum = parseFloat(contractValue)
      if (Number.isNaN(contractNum)) {
        setFormError('Contract value must be a valid number.')
        return
      }
    }

    let pctWeek: number | null = null
    if (percentThisWeekInput.trim()) {
      pctWeek = parseFloat(percentThisWeekInput)
      if (Number.isNaN(pctWeek) || pctWeek < 0 || pctWeek > 100) {
        setFormError('% complete this week must be between 0 and 100.')
        return
      }
    }

    let cumPct: number | null = null
    if (cumulativePercentInput.trim()) {
      cumPct = parseFloat(cumulativePercentInput)
      if (Number.isNaN(cumPct) || cumPct < 0 || cumPct > 100) {
        setFormError('Cumulative % must be between 0 and 100.')
        return
      }
    }

    const sorted = [...rows].sort((a, b) => a.line_order - b.line_order)
    const last = sorted[sorted.length - 1]
    const nextOrder = last ? last.line_order + 1 : 1

    setSaving(true)
    const wn = resolveWeekNumberForInsert(weekLabel.trim(), chronWeeks)
    const { error } = await supabase.from('valuations').insert({
      project_id: project.id,
      week_number: wn,
      item_name: description.trim(),
      contract_value: contractNum,
      percentage: pctWeek ?? 0,
      cumulative_percent: cumPct,
      amount,
      locked: false,
      line_order: nextOrder,
    })
    setSaving(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setDescription('')
    setContractValue(
      project.contract_value != null ? String(project.contract_value) : '',
    )
    setPercentThisWeekInput('')
    setAmountThisWeek('')
    setCumulativePercentInput('')
    setLineStatus('unpaid')
    setWeekLabel((w) => w.trim())

    const { data, error: refetchError } = await supabase
      .from('valuations')
      .select('*')
      .eq('project_id', project.id)
      .order('line_order', { ascending: true })

    if (!refetchError && data) {
      setRows(normalizeValuationRows(data as Record<string, unknown>[]))
    }
  }

  const activeCount = filteredRows.filter((r) => num(r.percent_complete) > 0)
    .length

  return (
    <div className="val-portal-root" id="pg-valuation">
      <div className="stats">
        <div className="sc a">
          <div className="sl">Contract</div>
          <div className="sv" style={{ color: 'var(--ac)' }}>
            {contractSum > 0 ? formatMoneyGBP(contractSum) : '—'}
          </div>
          <div className="ss">Original</div>
        </div>
        <div className="sc g">
          <div className="sl">Total Drawn</div>
          <div className="sv" style={{ color: 'var(--gr)' }}>
            {formatMoneyGBP(cumulativeDrawnThrough)}
          </div>
          <div className="ss">{drawPctOfContract.toFixed(1)}%</div>
        </div>
        <div className="sc b">
          <div className="sl">This Week Cert</div>
          <div className="sv" style={{ color: 'var(--bl)' }}>
            {formatMoneyGBP(thisWeekCertificate)}
          </div>
        </div>
        <div className="sc p">
          <div className="sl">Remaining</div>
          <div className="sv" style={{ color: 'var(--pu)' }}>
            {revisedContract > 0 ? formatMoneyGBP(remainingVsCert) : '—'}
          </div>
        </div>
        <div className="sc t">
          <div className="sl">Locked Items</div>
          <div className="sv" style={{ color: 'var(--tl)' }}>
            {lockedCount}/{filteredRows.length || 0}
          </div>
        </div>
      </div>

      <div className="portal-live-panel" style={{ marginTop: 14 }}>
        <div className="plp-title">Contract Value Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <div className="plp-card">
            <div className="plp-label">Original Contract</div>
            <div className="plp-value" style={{ color: 'var(--ac)' }}>
              {contractSum > 0 ? formatMoneyGBP(contractSum) : '—'}
            </div>
            <div className="plp-sub">Signed contract value</div>
          </div>
          <div className="plp-card accent">
            <div className="plp-label">Variations Approved</div>
            <div className="plp-value" style={{ color: 'var(--ac)' }}>
              {variationsTotal > 0 ? formatMoneyGBP(variationsTotal) : '£0'}
            </div>
            <div className="plp-sub">Net approved variations</div>
          </div>
          <div className="plp-card accent">
            <div className="plp-label">Variations Pending</div>
            <div className="plp-value" style={{ color: 'var(--ac)' }}>£0</div>
            <div className="plp-sub">0 pending</div>
          </div>
          <div className="plp-card success">
            <div className="plp-label">Revised Contract</div>
            <div className="plp-value" style={{ color: 'var(--gr)' }}>
              {revisedContract > 0 ? formatMoneyGBP(revisedContract) : '—'}
            </div>
            <div className="plp-sub">Inc. approved vars</div>
          </div>
          <div className="plp-card warn">
            <div className="plp-label">Max Exposure</div>
            <div className="plp-value" style={{ color: 'var(--rd)' }}>
              {revisedContract > 0 ? formatMoneyGBP(revisedContract) : '—'}
            </div>
            <div className="plp-sub">Inc. all pending vars</div>
          </div>
        </div>
      </div>

      <div className="wk-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="wk-bar-lbl">Valuation Week</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="wk-nav-btn"
              disabled={weekIdx <= 0}
              onClick={() => navigateWeek(-1)}
            >
              ◀
            </button>
            <div style={{ textAlign: 'center' }}>
              <div className="wk-disp">{weekDisplayLine}</div>
              <div className="wk-dates-lbl">{weekRangeStr}</div>
            </div>
            <button
              type="button"
              className="wk-nav-btn"
              disabled={weekIdx < 0 || weekIdx >= chronWeeks.length - 1}
              onClick={() => navigateWeek(1)}
            >
              ▶
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div className="wk-bar-lbl">Programme</div>
          <div className="wk-prog-track">
            <div
              className="wk-prog-fill"
              style={{ width: `${progPct}%` }}
            />
          </div>
          <div className="wk-prog-meta">
            <span>
              Wk {weekOrdinal} of {totalWeeksProg}
            </span>
            <span>{progPct}%</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-tl" onClick={handleAutoSuggest}>
            ⚡ Auto-suggest
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleClearWeek}>
            ✕ Clear week
          </button>
        </div>
        <div>
          <div className="wk-bar-lbl">Week cert</div>
          <div className="wk-cert-live">{formatMoneyGBP(thisWeekCertificate)}</div>
        </div>
      </div>

      <div className="alert al-i">
        <span>💡</span>
        <span>
          <strong>{weekDisplayLine}</strong> ({weekRangeStr}): {activeCount} items
          active. Enter % per item based on actual work done. 🔒 Lock only when
          100% complete on site.
        </span>
      </div>

      {loadError ? (
        <div className="val-portal-error" role="alert">
          Could not load valuations: {loadError}
        </div>
      ) : null}

      {loading ? (
        <p className="val-loading">Loading…</p>
      ) : (
        <div className="two-col">
          <div>
            <div className="panel">
              <div className="ph">
                <div>
                  <div className="pt">VALUATION SCHEDULE</div>
                  <div className="ps">
                    Week {weekOrdinal} — {weekRangeStr.replace('–', 'to')}
                  </div>
                </div>
                <div className="ph-hint">
                  🔒 Lock item only when 100% complete on site
                </div>
              </div>
              <div className="vtbl-wrap">
                <table className="vtbl">
                  <thead>
                    <tr>
                      <th style={{ width: '16%', minWidth: 130 }}>Item</th>
                      <th>Contract £</th>
                      <th>Prev Drawn £</th>
                      <th>Remaining £</th>
                      <th>Site Status</th>
                      <th>This Wk %</th>
                      <th>This Wk £</th>
                      <th className="th-claimed">Claimed to Date £</th>
                      <th>Balance Left £</th>
                      <th className="th-pctsplit">% Claimed / % Left</th>
                      <th>Lock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableGroups.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="val-empty-cell">
                          No valuation lines for this period.
                        </td>
                      </tr>
                    ) : (
                      tableGroups.map((g) => (
                        <Fragment key={`ph-${g.phase}`}>
                          <tr>
                            <td colSpan={11} className="ph-cell">
                              {g.phase}
                            </td>
                          </tr>
                          {g.rows.map((r) => {
                            const cv = num(r.contract_value)
                            const prev = activePeriod
                              ? prevDrawnForTrade(
                                  rows,
                                  r.description ?? '',
                                  activePeriod,
                                  chronWeeks,
                                )
                              : 0
                            const rem = Math.max(0, cv - prev)
                            const pctW = pctThisWeek(r)
                            const amt = num(r.amount_due)
                            const cum = pctCumulative(r)
                            const claimed =
                              cum != null
                                ? (cv * cum) / 100
                                : prev + amt
                            const bal = Math.max(0, cv - claimed)
                            const claimedPct = cv > 0 ? (claimed / cv) * 100 : 0
                            const leftPct = 100 - claimedPct
                            const locked = lockedIds.has(r.id)
                            const isDim =
                              pctW === 0 || pctW == null
                                ? !locked
                                : false
                            const active =
                              (pctW ?? 0) > 0 || (cum ?? 0) > 0
                            return (
                              <tr
                                key={r.id}
                                className={`${locked ? 'locked-row-bg' : ''} ${isDim ? 'dimmed' : ''}`}
                              >
                                <td className="td-item">
                                  {active ? (
                                    <span className="dot-active" />
                                  ) : null}
                                  <span>{r.description?.trim() || '—'}</span>
                                </td>
                                <td className="td-mono">{formatMoneyGBP(cv)}</td>
                                <td className="td-mono td-mu">{formatMoneyGBP(prev)}</td>
                                <td className="td-mono">
                                  {rem <= 0 ? '✓ Full' : formatMoneyGBP(rem)}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${active ? 'b-ac' : 'b-mu'}`}
                                  >
                                    {active ? 'Active' : 'Pending'}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    className={`pi ${(pctW ?? 0) > 0 ? 'hv' : ''}`}
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    disabled={locked}
                                    value={pctW ?? ''}
                                    placeholder="0%"
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value)
                                      if (Number.isNaN(v)) return
                                      void updateRowPct(r, v)
                                    }}
                                  />
                                </td>
                                <td className="td-mono td-mu">
                                  {amt > 0 ? formatMoneyGBP(amt) : '—'}
                                </td>
                                <td className="td-claimed">
                                  <span className="td-claimed-inner">
                                    {formatMoneyGBP(claimed)}
                                  </span>
                                </td>
                                <td className="td-mono">
                                  {bal <= 0
                                    ? '✓ Nil'
                                    : formatMoneyGBP(bal)}
                                </td>
                                <td className="td-split">
                                  <div className="split-bar-wrap">
                                    <div
                                      className="split-bar-fill"
                                      style={{
                                        width: `${Math.min(100, claimedPct)}%`,
                                        background:
                                          claimedPct >= 100
                                            ? 'var(--gr)'
                                            : claimedPct > 50
                                              ? 'var(--tl)'
                                              : 'var(--ac)',
                                      }}
                                    />
                                  </div>
                                  <div className="split-meta">
                                    <span className="c-tl">
                                      ✓ {claimedPct.toFixed(1)}%
                                    </span>
                                    <span className="c-rd">
                                      ⬜ {leftPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={`lock-btn ${locked ? 'lkd' : ''}`}
                                    title="Lock only when 100% complete"
                                    onClick={() => toggleLock(r.id)}
                                  >
                                    {locked ? '🔒 Locked' : 'Lock ✓'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="foot-totals">
                      <td>TOTALS</td>
                      <td className="foot-ac">{formatMoneyGBP(totalContractCol)}</td>
                      <td className="foot-mu">{formatMoneyGBP(totalPrevDrawn)}</td>
                      <td className="foot-mu">{formatMoneyGBP(totalRemaining)}</td>
                      <td />
                      <td />
                      <td className="foot-gr">{formatMoneyGBP(thisWeekCertificate)}</td>
                      <td className="foot-claimed">{formatMoneyGBP(cumulativeDrawnThrough)}</td>
                      <td className="foot-rd">{formatMoneyGBP(totalBalanceLeft)}</td>
                      <td className="foot-split">
                        <div className="split-bar-wrap foot-total-bar">
                          <div
                            style={{
                              width: `${Math.min(100, footerClaimedPct)}%`,
                              height: '100%',
                              background: 'var(--tl)',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <div className="split-meta">
                          <span className="c-tl">
                            ✓ {footerClaimedPct.toFixed(1)}%
                          </span>
                          <span className="c-rd">
                            ⬜ {(100 - footerClaimedPct).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="vtbl-footnote">
                Weeks 1 &amp; 2 loaded from your valuation file. Adjust any figures — nothing is locked until you lock it manually.
              </div>
            </div>
          </div>

          <div>
            <div className="cert-side">
              <div className="cert-hd">
                <div className="cert-ttl">VALUATION CERT</div>
                <div className="cert-sub">
                  Week {weekOrdinal} — {weekRangeStr.split('–')[0]?.trim()}
                </div>
              </div>
              <div className="cert-bd">
                <div className="cbox cbox-ac">
                  <div className="cbox-lbl">This Week Certificate</div>
                  <div className="cbox-val cbox-wk">{formatMoneyGBP(thisWeekCertificate)}</div>
                </div>
                <div className="cbox cbox-gr">
                  <div className="cbox-lbl">Cumulative Drawn</div>
                  <div className="cbox-val cbox-cum">{formatMoneyGBP(cumulativeDrawnThrough)}</div>
                  <div className="cbox-sub">
                    {revisedContract > 0
                      ? `${((cumulativeDrawnThrough / revisedContract) * 100).toFixed(1)}% of ${formatMoneyGBP(revisedContract)}`
                      : '—'}
                  </div>
                </div>
                <div className="cbox cbox-rd">
                  <div className="cbox-lbl">Balance to Draw</div>
                  <div className="cbox-val cbox-bal">
                    {revisedContract > 0
                      ? formatMoneyGBP(Math.max(0, revisedContract - cumulativeDrawnThrough))
                      : '—'}
                  </div>
                </div>
                <div className="cert-crows">
                  <div className="crow">
                    <span className="crow-l">Items claimed</span>
                    <span className="crow-v" style={{ color: 'var(--bl)' }}>
                      {itemsClaimedThisWeek}
                    </span>
                  </div>
                  <div className="crow">
                    <span className="crow-l">Items locked</span>
                    <span className="crow-v" style={{ color: 'var(--gr)' }}>
                      {lockedCount}
                    </span>
                  </div>
                  <div className="crow">
                    <span className="crow-l">Avg % this week</span>
                    <span className="crow-v" style={{ color: 'var(--tl)' }}>
                      {avgPctThisWeek != null
                        ? `${avgPctThisWeek.toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className="cert-bar-lbl">
                  <span>Drawn vs contract</span>
                  <span>{certBarPct.toFixed(1)}%</span>
                </div>
                <div className="bigbar">
                  <div
                    className="bigbar-fill"
                    style={{
                      width: `${certBarPct}%`,
                      background: 'linear-gradient(90deg, var(--bl), var(--ac))',
                    }}
                  />
                </div>
                <button type="button" className="btn btn-ac cert-print" onClick={printCertificate}>
                  ↓ Print Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="payment-tracker-wrap">
        <div className="panel">
          <div className="ph">
            <div>
              <div className="pt">PAYMENT TRACKER</div>
              <div className="ps">Certificates issued · Mark each as paid when received</div>
            </div>
            <div className="pt-meta">
              <span>
                Total Paid:{' '}
                <span style={{ color: 'var(--gr)' }}>{formatMoneyGBP(paidToDate)}</span>
              </span>
              <span>
                Outstanding:{' '}
                <span style={{ color: 'var(--rd)' }}>{formatMoneyGBP(outstanding)}</span>
              </span>
            </div>
          </div>
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Amount £</th>
                  <th>Date Issued</th>
                  <th>Due Date</th>
                  <th>Date Paid</th>
                  <th>Status</th>
                  <th>Days O/S</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.status.toLowerCase() === 'paid')
                  .map((r) => (
                    <tr key={`pt-${r.id}`}>
                      <td>{r.week_label}</td>
                      <td className="td-mono">{formatMoneyGBP(num(r.amount_due))}</td>
                      <td className="td-mono">
                        {r.created_at ? formatIsoDateOnly(r.created_at.slice(0, 10)) : '—'}
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <span className="badge b-gr">Paid</span>
                      </td>
                      <td>—</td>
                    </tr>
                  ))}
                {rows.filter((r) => r.status.toLowerCase() === 'paid').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="val-empty-cell">
                      No paid certificates yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel val-add-panel">
        <div className="ph">
          <div>
            <div className="pt">ADD VALUATION LINE</div>
            <div className="ps">New trade line for a certificate period</div>
          </div>
        </div>
        <div className="cert-bd">
          <form className="val-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="Week label"
              className="pi-input"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description / trade"
              className="pi-input"
            />
            <input
              type="number"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              placeholder="Contract £"
              className="pi-input"
            />
            <input
              type="number"
              value={percentThisWeekInput}
              onChange={(e) => setPercentThisWeekInput(e.target.value)}
              placeholder="This wk %"
              className="pi-input"
            />
            <input
              type="number"
              value={amountThisWeek}
              onChange={(e) => setAmountThisWeek(e.target.value)}
              placeholder="This wk £"
              className="pi-input"
            />
            <input
              type="number"
              value={cumulativePercentInput}
              onChange={(e) => setCumulativePercentInput(e.target.value)}
              placeholder="Cumulative %"
              className="pi-input"
            />
            <select
              value={lineStatus}
              onChange={(e) =>
                setLineStatus(e.target.value as 'paid' | 'unpaid')
              }
              className="pi-input"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
            <button type="submit" disabled={saving} className="btn btn-ac">
              {saving ? 'Saving…' : 'Add line'}
            </button>
          </form>
          {formError ? (
            <p className="val-form-error" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .val-portal-root {
          --bg: #080a0f;
          --s: #0f1219;
          --s2: #161b26;
          --bd: #1e2535;
          --tx: #e2e8f8;
          --mu: #4a5568;
          --ac: #f4a623;
          --gr: #00e676;
          --rd: #ff3d57;
          --bl: #3b8bff;
          --tl: #00bfa5;
          --pu: #8b5cf6;
          color: var(--tx);
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          max-width: 1440px;
          margin: 0 auto;
          padding: 20px 28px;
          position: relative;
          z-index: 1;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .sc {
          background: var(--s);
          border: 1px solid var(--bd);
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
          border-radius: 12px 12px 0 0;
        }
        .sc.a::before {
          background: var(--ac);
        }
        .sc.g::before {
          background: var(--gr);
        }
        .sc.b::before {
          background: var(--bl);
        }
        .sc.p::before {
          background: var(--pu);
        }
        .sc.t::before {
          background: var(--tl);
        }
        .sl {
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--mu);
          margin-bottom: 3px;
        }
        .sv {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 1px;
          line-height: 1;
        }
        .ss {
          font-size: 9px;
          color: var(--mu);
          margin-top: 2px;
        }
        .portal-live-panel {
          background: var(--s);
          border: 1px solid var(--bd);
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
        .plp-card {
          background: #080a0f;
          border: 1px solid var(--bd);
          border-radius: 10px;
          padding: 10px;
        }
        .plp-card.accent {
          background: rgba(244, 166, 35, 0.05);
          border-color: rgba(244, 166, 35, 0.2);
        }
        .plp-card.success {
          background: rgba(0, 230, 118, 0.05);
          border-color: rgba(0, 230, 118, 0.2);
        }
        .plp-card.warn {
          background: rgba(255, 61, 87, 0.05);
          border-color: rgba(255, 61, 87, 0.2);
        }
        .plp-label {
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--mu);
        }
        .plp-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          margin-top: 4px;
        }
        .plp-sub {
          font-size: 9px;
          color: var(--mu);
          margin-top: 3px;
        }
        .wk-bar {
          background: var(--s);
          border: 1px solid var(--bd);
          border-radius: 12px;
          padding: 12px 18px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .wk-bar-lbl {
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--mu);
          margin-bottom: 3px;
        }
        .wk-nav-btn {
          background: var(--s2);
          border: 1px solid var(--bd);
          border-radius: 6px;
          padding: 5px 11px;
          font-size: 12px;
          color: var(--tx);
          cursor: pointer;
        }
        .wk-nav-btn:hover:not(:disabled) {
          border-color: var(--ac);
          color: var(--ac);
        }
        .wk-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .wk-disp {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 2px;
          color: var(--ac);
          min-width: 110px;
          text-align: center;
        }
        .wk-dates-lbl {
          font-size: 10px;
          color: var(--mu);
          text-align: center;
        }
        .wk-prog-track {
          height: 7px;
          background: var(--s2);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--bd);
        }
        .wk-prog-fill {
          height: 100%;
          background: linear-gradient(90deg, #b37200, #f4a623);
          border-radius: 3px;
          transition: width 0.4s;
        }
        .wk-prog-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 2px;
          font-size: 9px;
          color: var(--mu);
        }
        .wk-cert-live {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          letter-spacing: 1px;
          color: var(--gr);
        }
        .btn {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 13px;
          border-radius: 7px;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .btn-ac {
          background: var(--ac);
          color: #000;
          border-color: var(--ac);
        }
        .btn-ghost {
          background: transparent;
          border-color: var(--bd);
          color: var(--tx);
        }
        .btn-tl {
          background: rgba(0, 191, 165, 0.1);
          border-color: rgba(0, 191, 165, 0.3);
          color: var(--tl);
        }
        .alert {
          border-radius: 9px;
          padding: 9px 13px;
          margin-bottom: 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
        }
        .al-i {
          background: rgba(59, 139, 255, 0.07);
          border: 1px solid rgba(59, 139, 255, 0.2);
          color: var(--bl);
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 14px;
          align-items: start;
        }
        .panel {
          background: var(--s);
          border: 1px solid var(--bd);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .ph {
          padding: 12px 18px;
          border-bottom: 1px solid var(--bd);
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
          font-size: 10px;
          color: var(--mu);
        }
        .ph-hint {
          font-size: 9px;
          color: var(--mu);
        }
        .vtbl-wrap {
          overflow-x: auto;
          max-height: 60vh;
          overflow-y: auto;
        }
        .vtbl {
          width: 100%;
          border-collapse: collapse;
        }
        .vtbl thead th {
          background: var(--s2);
          color: var(--mu);
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 8px 9px;
          text-align: left;
          border-bottom: 1px solid var(--bd);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .th-claimed {
          background: rgba(0, 230, 118, 0.08) !important;
          color: var(--gr) !important;
        }
        .th-pctsplit {
          background: rgba(0, 191, 165, 0.08) !important;
          color: var(--tl) !important;
          min-width: 160px;
        }
        .vtbl td {
          padding: 5px 9px;
          border-bottom: 1px solid rgba(30, 37, 53, 0.8);
          vertical-align: middle;
          font-size: 11px;
        }
        .ph-cell {
          background: rgba(244, 166, 35, 0.04);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--mu);
          padding: 4px 9px;
        }
        .locked-row-bg {
          background: rgba(0, 230, 118, 0.03);
        }
        .dimmed {
          opacity: 0.38;
        }
        .td-item {
          font-weight: 500;
          padding: 5px 9px;
        }
        .dot-active {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gr);
          margin-right: 4px;
          vertical-align: middle;
        }
        .td-mono {
          font-size: 10px;
        }
        .td-mu {
          color: var(--mu);
        }
        .td-claimed {
          background: rgba(0, 230, 118, 0.04);
        }
        .td-claimed-inner {
          font-size: 11px;
          font-weight: 500;
          color: var(--tl);
        }
        .td-split {
          background: rgba(0, 191, 165, 0.04);
          min-width: 160px;
        }
        .split-bar-wrap {
          flex: 1;
          height: 12px;
          background: var(--s2);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--bd);
        }
        .split-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .split-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 3px;
  font-size: 9px;
        }
        .c-tl {
          color: var(--tl);
        }
        .c-rd {
          color: var(--rd);
        }
        .pi {
          width: 52px;
          font-size: 11px;
          padding: 3px 5px;
          border: 1px solid var(--bd);
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx);
          text-align: center;
        }
        .pi:focus {
          border-color: var(--ac);
          outline: none;
        }
        .pi.hv {
          border-color: rgba(244, 166, 35, 0.4);
          color: var(--ac);
        }
        .pi:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 9px;
          white-space: nowrap;
        }
        .b-ac {
          background: rgba(244, 166, 35, 0.1);
          color: var(--ac);
        }
        .b-mu {
          background: rgba(74, 85, 104, 0.2);
          color: var(--mu);
        }
        .b-gr {
          background: rgba(0, 230, 118, 0.1);
          color: var(--gr);
        }
        .lock-btn {
          background: transparent;
          border: 1px solid var(--bd);
          border-radius: 4px;
          color: var(--mu);
          font-size: 9px;
          padding: 2px 6px;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
        }
        .lock-btn:hover {
          border-color: var(--gr);
          color: var(--gr);
        }
        .lock-btn.lkd {
          background: rgba(0, 230, 118, 0.08);
          border-color: rgba(0, 230, 118, 0.3);
          color: var(--gr);
        }
        .foot-totals td {
          border-top: 2px solid var(--bd);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 13px;
          letter-spacing: 1px;
        }
        .foot-ac {
          color: var(--ac);
        }
        .foot-mu {
          font-size: 11px;
          color: var(--mu);
        }
        .foot-gr {
          font-size: 15px;
          color: var(--gr);
        }
        .foot-claimed {
          font-size: 15px;
          color: var(--tl);
          background: rgba(0, 230, 118, 0.06);
        }
        .foot-rd {
          font-size: 14px;
          color: var(--rd);
        }
        .vtbl-footnote {
          padding: 7px 12px;
          font-size: 9px;
          color: var(--mu);
          border-top: 1px solid var(--bd);
        }
        .cert-side {
          background: var(--s);
          border: 1px solid var(--bd);
          border-radius: 14px;
          overflow: hidden;
          position: sticky;
          top: 110px;
        }
        .cert-hd {
          background: linear-gradient(
            135deg,
            rgba(244, 166, 35, 0.08),
            rgba(0, 230, 118, 0.04)
          );
          border-bottom: 1px solid var(--bd);
          padding: 13px 16px;
        }
        .cert-ttl {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 17px;
          letter-spacing: 2px;
          color: var(--ac);
        }
        .cert-sub {
          font-size: 9px;
          color: var(--mu);
          margin-top: 1px;
        }
        .cert-bd {
          padding: 13px 15px;
        }
        .cbox {
          border-radius: 9px;
          padding: 11px 13px;
          text-align: center;
          margin-bottom: 9px;
        }
        .cbox-ac {
          background: rgba(244, 166, 35, 0.06);
          border: 1px solid rgba(244, 166, 35, 0.2);
        }
        .cbox-gr {
          background: rgba(0, 230, 118, 0.05);
          border: 1px solid rgba(0, 230, 118, 0.15);
        }
        .cbox-rd {
          background: rgba(255, 61, 87, 0.04);
          border: 1px solid rgba(255, 61, 87, 0.15);
        }
        .cbox-lbl {
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--mu);
          margin-bottom: 3px;
        }
        .cbox-val {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 1px;
        }
        .cbox-wk {
          font-size: 32px;
          color: var(--ac);
        }
        .cbox-cum {
          font-size: 20px;
          color: var(--gr);
        }
        .cbox-bal {
          font-size: 17px;
          color: var(--rd);
        }
        .cbox-sub {
          font-size: 9px;
          color: var(--mu);
          margin-top: 2px;
        }
        .cert-crows {
          margin-bottom: 10px;
        }
        .crow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid rgba(30, 37, 53, 0.7);
          font-size: 11px;
        }
        .crow:last-child {
          border-bottom: none;
        }
        .crow-l {
          color: var(--mu);
        }
        .crow-v {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
        }
        .cert-bar-lbl {
          font-size: 9px;
          color: var(--mu);
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
        }
        .bigbar {
          height: 8px;
          background: var(--s2);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--bd);
          margin: 4px 0;
        }
        .bigbar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s;
        }
        .cert-print {
          width: 100%;
          margin-top: 12px;
        }
        .payment-tracker-wrap {
          padding: 0 0 20px;
        }
        .pt-meta {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: var(--mu);
          flex-wrap: wrap;
        }
        .pt-table-wrap {
          overflow-x: auto;
        }
        .pt-table {
          width: 100%;
          border-collapse: collapse;
        }
        .pt-table th {
          text-align: left;
          color: var(--mu);
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 8px 12px;
          border-bottom: 1px solid var(--bd);
          background: var(--s2);
        }
        .pt-table td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(30, 37, 53, 0.7);
          font-size: 11px;
        }
        .val-add-form {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
          align-items: end;
        }
        .pi-input {
          padding: 6px 8px;
          border: 1px solid var(--bd);
          border-radius: 4px;
          background: var(--s2);
          color: var(--tx);
          font-size: 11px;
        }
        .val-add-panel {
          margin-top: 8px;
        }
        .val-add-panel .pt {
          font-size: 14px;
        }
        .val-portal-error {
          padding: 12px;
          border: 1px solid rgba(255, 61, 87, 0.4);
          border-radius: 8px;
          color: #fecaca;
          margin-bottom: 12px;
        }
        .val-loading {
          text-align: center;
          padding: 24px;
          color: var(--mu);
        }
        .val-empty-cell {
          text-align: center;
          color: var(--mu);
          padding: 16px;
        }
        .val-form-error {
          color: #fecaca;
          margin-top: 8px;
          font-size: 10px;
        }
        @media (max-width: 1024px) {
          .two-col {
            grid-template-columns: 1fr;
          }
          .cert-side {
            position: relative;
            top: 0;
          }
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}

const DOCUMENT_FOLDERS = [
  'Contracts',
  'Drawings',
  'Building Control',
  'Invoices',
  'Photos',
  'Other',
] as const

type DocumentFolder = (typeof DOCUMENT_FOLDERS)[number]

const DOCUMENTS_BUCKET = 'project-documents'

type DocumentRow = {
  id: string
  project_id: string
  folder: string
  file_name: string
  storage_path: string
  content_type: string | null
  file_size: number | string | null
  created_at: string | null
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
                        {formatInstantAsDate(d.created_at)}
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
    const nowMs = todayUtcMidnightMs()
    const elapsedDays = (nowMs - projectStartMs) / 86400000
    return Math.max(1, Math.floor(elapsedDays / 7) + 1)
  }, [projectStartMs])

  const todayLineLeftPct = useMemo(() => {
    if (weekRange.length === 0) return null
    const span = maxWeek - minWeek + 1
    if (span <= 0) return null
    const pos = ((todayWeek - minWeek + 0.5) / span) * 100
    return Math.max(0, Math.min(100, pos))
  }, [todayWeek, minWeek, maxWeek, weekRange.length])

  const delayDays = Math.max(0, project.total_delays_days ?? 0)
  const variationDays = Math.max(0, Math.round(Math.abs(num(project.variations_total)) / 10000))
  const variationsCount = num(project.variations_total) === 0 ? 0 : 1
  const totalProgrammeShift = delayDays + variationDays
  const revisedEndDate = useMemo(() => {
    if (!project.handover_date) return '—'
    const endMs = utcMillisFromIsoDate(project.handover_date)
    if (endMs == null) return '—'
    const shifted = endMs + totalProgrammeShift * 86400000
    return formatIsoDateOnly(new Date(shifted).toISOString())
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

  const valuationPeriods = useMemo(
    () => valuationPeriodsSorted(valuationRows),
    [valuationRows],
  )

  const actualByPeriod = useMemo(() => {
    let cumul = 0
    return valuationPeriods.map((p) => {
      cumul += p.weekCert
      return {
        dateMs: p.minCreated,
        cumulative: cumul,
      }
    })
  }, [valuationPeriods])

  const totalCertified = useMemo(
    () => valuationRows.reduce((s, r) => s + num(r.amount_due), 0),
    [valuationRows],
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
        ? handover + totalProgrammeShift * 86400000 + 14 * 86400000
        : null
    const programmeEnd =
      weekMeta.length > 0
        ? projectStartMs + (maxWeek - minWeek + 1) * 7 * 86400000
        : projectStartMs + 18 * 7 * 86400000
    const lastPeriod =
      valuationPeriods.length > 0
        ? Math.max(...valuationPeriods.map((p) => p.minCreated))
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
    valuationPeriods,
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
              <div className="plp-value" style={{ color: '#FF3D57' }}>{delayDays}</div>
              <div className="plp-sub">Calendar days lost</div>
            </div>
            <div className="plp-card warn">
              <div className="plp-label">Revised End Date</div>
              <div className="plp-value date">{revisedEndDate}</div>
              <div className="plp-sub">Original: {formatIsoDateOnly(project.handover_date)}</div>
            </div>
            <div className="plp-card accent">
              <div className="plp-label">Variation Days</div>
              <div className="plp-value" style={{ color: '#F4A623' }}>{variationDays}</div>
              <div className="plp-sub">Added to programme</div>
            </div>
            <div className="plp-card accent">
              <div className="plp-label">Variations Count</div>
              <div className="plp-value" style={{ color: '#F4A623' }}>{variationsCount}</div>
              <div className="plp-sub">Logged variations</div>
            </div>
            <div className="plp-card">
              <div className="plp-label">Total Programme Shift</div>
              <div className="plp-value" style={{ color: '#3B8BFF' }}>{totalProgrammeShift} days</div>
              <div className="plp-sub">Delays + variation days</div>
            </div>
          </div>
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
                      {w.date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
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
                          {formatInstantAsDate(m.created_at)}
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
  return ((clamped - startMs) / (endMs - startMs)) * 100
}

function weeksDurationBetween(
  startIso: string | null,
  endIso: string | null,
): number | null {
  const startMs = utcMillisFromIsoDate(startIso)
  const endMs = utcMillisFromIsoDate(endIso)
  if (startMs == null || endMs == null) return null
  const days = (endMs - startMs) / 86400000
  if (days < 0) return null
  return Math.max(0, Math.round(days / 7))
}

function weeksUntilHandover(handoverIso: string | null): {
  weeks: number | null
  overdue: boolean
} {
  const endMs = utcMillisFromIsoDate(handoverIso)
  if (endMs == null) return { weeks: null, overdue: false }
  const nowMs = todayUtcMidnightMs()
  const days = (endMs - nowMs) / 86400000
  const w = Math.ceil(days / 7)
  if (w < 0) return { weeks: 0, overdue: true }
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

function CommandCentreStatCard({
  label,
  value,
  hint,
  valueColor,
}: {
  label: string
  value: string
  hint?: string
  valueColor: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border px-5 py-5"
      style={{
        borderColor: border,
        backgroundColor: '#080A0F',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-r-full opacity-95"
        style={{
          background: valueColor,
        }}
        aria-hidden
      />
      <p className="pl-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </p>
      <p
        className="mt-2 pl-2 text-3xl font-bold tabular-nums tracking-tight"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 pl-2 text-xs text-[#475569]">{hint}</p>
      ) : null}
    </div>
  )
}

function CommandCentreProgressRow({
  label,
  percent,
  sublabel,
  barColor,
}: {
  label: string
  percent: number | null
  sublabel?: string
  barColor: string
}) {
  const pct =
    percent == null ? null : Math.min(100, Math.max(0, percent))
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[#E2E8F8]">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-[#F8FAFC]">
          {pct != null ? formatPercentDisplay(pct) : '—'}
        </span>
      </div>
      {sublabel ? (
        <p className="mt-0.5 text-xs text-[#64748B]">{sublabel}</p>
      ) : null}
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: '#1E2535' }}
      >
        <div
          className="h-2.5 rounded-full transition-[width] duration-500"
          style={{
            width: pct != null ? `${pct}%` : '0%',
            backgroundColor: barColor,
            boxShadow: pct != null && pct > 0 ? `0 0 12px ${barColor}59` : undefined,
          }}
        />
      </div>
    </div>
  )
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      const { data, error } = await supabase
        .from('valuations')
        .select('*')
        .eq('project_id', project.id)
        .order('line_order', { ascending: true })

      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setRows([])
      } else {
        setRows(normalizeValuationRows(data as Record<string, unknown>[]))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [project.id])

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

  const variationsTotal = num(project.variations_total)
  const revisedContract =
    contractSum > 0 ? contractSum + variationsTotal : null

  const totalDrawn = useMemo(() => {
    return rows.reduce(
      (s, r) =>
        r.status.toLowerCase() === 'paid' ? s + num(r.amount_due) : s,
      0,
    )
  }, [rows])

  const remaining =
    revisedContract != null && revisedContract > 0
      ? Math.max(0, revisedContract - totalDrawn)
      : null

  const completionPct = weightedValuePercent(latestRows, pctCumulative)

  const timelinePct = useMemo(
    () => timelinePercent(project.start_date, project.handover_date),
    [project.start_date, project.handover_date],
  )

  const paymentsPct =
    revisedContract != null && revisedContract > 0
      ? (totalDrawn / revisedContract) * 100
      : null

  const durationWeeks = useMemo(
    () => weeksDurationBetween(project.start_date, project.handover_date),
    [project.start_date, project.handover_date],
  )

  const handoverWeeks = useMemo(
    () => weeksUntilHandover(project.handover_date),
    [project.handover_date],
  )

  const originalContract = project.contract_value
  const delaysDaysRaw = project.total_delays_days
  const lockedItems = project.locked_items_count ?? 0

  const currentWeekDisplay = latestPeriod ?? '—'

  const handoverStat =
    handoverWeeks.weeks == null
      ? '—'
      : handoverWeeks.overdue
        ? '0 (overdue)'
        : String(handoverWeeks.weeks)

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
            COMMAND CENTRE
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
            Live programme & commercial position
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            Contract, cash, build progress, key dates, and site weather — aligned
            with your valuation and project records in Supabase.
          </p>
        </div>
      </div>

      {loadError ? (
        <div
          className="rounded-lg border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Could not load valuations: {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CommandCentreStatCard
          label="Contract value"
          value={
            loading
              ? '…'
              : contractSum > 0
                ? formatMoneyGBP(contractSum)
                : '—'
          }
          hint="Original / baseline sum"
          valueColor={accent}
        />
        <CommandCentreStatCard
          label="Total drawn"
          value={loading ? '…' : formatMoneyGBP(totalDrawn)}
          hint="Paid valuation lines (all periods)"
          valueColor={success}
        />
        <CommandCentreStatCard
          label="Remaining"
          value={
            loading
              ? '…'
              : remaining != null
                ? formatMoneyGBP(remaining)
                : '—'
          }
          hint="Revised contract less drawn"
          valueColor={infoBlue}
        />
        <CommandCentreStatCard
          label="Current week"
          value={loading ? '…' : currentWeekDisplay}
          hint={
            latestPeriod ? 'Latest valuation period' : 'No valuation periods yet'
          }
          valueColor={accent}
        />
        <CommandCentreStatCard
          label="Weeks to handover"
          value={loading ? '…' : handoverStat}
          hint={
            handoverWeeks.overdue
              ? 'Past planned handover date'
              : 'From today to handover (calendar weeks)'
          }
          valueColor={danger}
        />
        <CommandCentreStatCard
          label="Items locked"
          value={loading ? '…' : String(lockedItems)}
          hint="Locked / frozen items on record"
          valueColor={cyan}
        />
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
        <div className="space-y-6 p-5 sm:p-7">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
              Progress
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Timeline, payments position, and build completion from the latest
              valuation period.
            </p>
          </div>
          <CommandCentreProgressRow
            label="Timeline"
            percent={timelinePct}
            sublabel="Elapsed programme vs start → handover"
            barColor={accent}
          />
          <CommandCentreProgressRow
            label="Payments (drawn to date)"
            percent={paymentsPct}
            sublabel="Paid certificates vs revised contract value"
            barColor={success}
          />
          <CommandCentreProgressRow
            label="Completion (build progress)"
            percent={completionPct}
            sublabel="Weighted cumulative % (latest period lines)"
            barColor={progressPurple}
          />
        </div>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderColor: border }}
      >
        {[
          {
            k: 'Start date',
            v: formatIsoDateOnly(project.start_date),
          },
          {
            k: 'Handover date',
            v: formatIsoDateOnly(project.handover_date),
          },
          {
            k: 'Duration (weeks)',
            v: durationWeeks != null ? String(durationWeeks) : '—',
          },
          {
            k: 'Deposit paid',
            v:
              project.deposit_paid === true
                ? 'Yes'
                : project.deposit_paid === false
                  ? 'No'
                  : '—',
          },
        ].map((row) => (
          <div
            key={row.k}
            className="relative overflow-hidden rounded-xl border px-5 py-4"
            style={{ borderColor: border, backgroundColor: '#080A0F' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              {row.k}
            </p>
            <p
              className="mt-2 text-lg font-semibold tabular-nums text-[#F8FAFC]"
              style={
                row.k === 'Deposit paid' && row.v === 'Yes'
                  ? { color: accent }
                  : undefined
              }
            >
              {row.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              LIVE WEATHER
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC]">
              Site conditions
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Open-Meteo forecast for{' '}
              <span style={{ color: accent }} className="font-medium">
                {SW14_7DF_LABEL}
              </span>
            </p>

            {weather.loading ? (
              <p className="mt-8 text-sm text-[#64748B]">Loading weather…</p>
            ) : weather.error ? (
              <p
                className="mt-6 rounded-lg border border-amber-900/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100"
                role="status"
              >
                {weather.error}
              </p>
            ) : weather.temp != null && weather.code != null ? (
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-4xl font-semibold tabular-nums tracking-tight text-[#F8FAFC]">
                    {Math.round(weather.temp)}
                    <span className="text-2xl text-[#94A3B8]">°C</span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#E2E8F8]">
                    {wmoWeatherLabel(weather.code)}
                  </p>
                  {weather.label ? (
                    <p className="mt-1 text-xs text-[#64748B]">{weather.label}</p>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-sm text-[#94A3B8] sm:text-right">
                  {weather.wind != null ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Wind
                      </dt>
                      <dd className="tabular-nums text-[#E2E8F8]">
                        {weather.wind.toFixed(0)} km/h
                      </dd>
                    </div>
                  ) : null}
                  {weather.humidity != null ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Humidity
                      </dt>
                      <dd className="tabular-nums text-[#E2E8F8]">
                        {Math.round(weather.humidity)}%
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[#64748B]">
                Live weather is temporarily fixed to SW14 7DF coordinates.
              </p>
            )}
          </div>
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
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
              LIVE PROJECT SUMMARY
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC]">
              Commercial snapshot
            </h3>
            <dl className="mt-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1E2535] pb-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Original contract
                </dt>
                <dd
                  className="text-right text-lg font-semibold tabular-nums"
                  style={{ color: accent }}
                >
                  {originalContract != null
                    ? formatMoneyGBP(num(originalContract))
                    : '—'}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1E2535] pb-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Variations total
                </dt>
                <dd className="text-right text-lg font-semibold tabular-nums text-[#F8FAFC]">
                  {formatSignedMoneyGBP(variationsTotal)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1E2535] pb-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Revised contract value
                </dt>
                <dd
                  className="text-right text-lg font-semibold tabular-nums"
                  style={{ color: accent }}
                >
                  {revisedContract != null && revisedContract > 0
                    ? formatMoneyGBP(revisedContract)
                    : '—'}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Total delays
                </dt>
                <dd className="text-right text-lg font-semibold tabular-nums text-[#F8FAFC]">
                  {delaysDaysRaw == null
                    ? '—'
                    : `${delaysDaysRaw} day${delaysDaysRaw === 1 ? '' : 's'}`}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )

  function CommandCentreCumulativeTab() {
    const cumulativeCert = rows.reduce((s, r) => s + num(r.cumulative_total), 0)
    const cumulativeDrawn = rows.reduce((s, r) => s + num(r.amount_due), 0)
    return (
      <div className="rounded-xl border p-5 sm:p-7" style={{ borderColor: border, backgroundColor: surface }}>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">CUMULATIVE</p>
        <h3 className="mt-1 text-lg font-semibold text-[#F8FAFC]">Cumulative drawdown</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <CommandCentreStatCard label="Certificates Total" value={formatMoneyGBP(cumulativeCert)} valueColor={accent} />
          <CommandCentreStatCard label="Drawn Total" value={formatMoneyGBP(cumulativeDrawn)} valueColor={success} />
          <CommandCentreStatCard label="Live Rows" value={String(rows.length)} valueColor={infoBlue} />
        </div>
      </div>
    )
  }

  function CommandCentreSimpleTab({
    title,
    subtitle,
    tone = accent,
  }: {
    title: string
    subtitle: string
    tone?: string
  }) {
    return (
      <div className="rounded-xl border p-6 text-center sm:p-10" style={{ borderColor: border, backgroundColor: surface }}>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">{title.toUpperCase()}</p>
        <h3 className="mt-2 text-xl font-semibold text-[#F8FAFC]">{title}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[#64748B]">{subtitle}</p>
        <div className="mx-auto mt-4 h-1 w-24 rounded-full" style={{ backgroundColor: tone }} />
      </div>
    )
  }

  let content: ReactNode
  switch (activeTab) {
    case 'overview':
      content = overviewContent
      break
    case 'programme':
      content = <ProgrammeTab project={project} />
      break
    case 'valuation':
      content = <ValuationTab project={project} />
      break
    case 'cumulative':
      content = <CommandCentreCumulativeTab />
      break
    case 'delays':
      content = (
        <CommandCentreSimpleTab
          title="Delays & Pauses"
          subtitle="Track pause events, approved EOT impacts, and recovery actions in a single timeline view."
          tone={danger}
        />
      )
      break
    case 'variations':
      content = (
        <CommandCentreSimpleTab
          title="Variations"
          subtitle="Review approved and pending variations with value, programme effect, and client decision status."
          tone={accent}
        />
      )
      break
    case 'on-track':
      content = (
        <CommandCentreSimpleTab
          title="On Track"
          subtitle="RAG overview of milestones, trade readiness, and commercial health against the baseline plan."
          tone={success}
        />
      )
      break
    case 'building-control':
      content = <PlaceholderPanel title="Building Control" />
      break
    default:
      content = overviewContent
  }

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

      {content}
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
  return (
    <div role="main" aria-live="polite">
      {renderPortalSection(activeSection, project)}
    </div>
  )
}
