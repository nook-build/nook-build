'use client'

import {
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

function formatPercent(v: number | string | null | undefined) {
  if (v == null) return '—'
  return formatPercentDisplay(num(v))
}

function ValuationStatusPill({ status }: { status: string }) {
  const paid = status.toLowerCase() === 'paid'
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
        paid
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
      }`}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  /** User-chosen certificate period; falls back to latest when null or stale. */
  const [periodOverride, setPeriodOverride] = useState<string | null>(null)

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
        setRows((data ?? []) as ValuationRecord[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const weekOpts = useMemo(() => weekOptionsFromRows(rows), [rows])

  const activePeriod = useMemo(() => {
    if (weekOpts.length === 0) return null
    if (periodOverride && weekOpts.includes(periodOverride)) {
      return periodOverride
    }
    return weekOpts[0] ?? null
  }, [weekOpts, periodOverride])

  const filteredRows = useMemo(() => {
    if (!activePeriod) return []
    return rows
      .filter((r) => r.week_label === activePeriod)
      .sort((a, b) => a.line_order - b.line_order)
  }, [rows, activePeriod])

  const { contractSum, lineValueSum, paidToDate, thisWeekCertificate, outstanding } =
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
        lineValueSum: lineSum,
        paidToDate: paid,
        thisWeekCertificate,
        outstanding,
      }
    }, [filteredRows, rows, project.contract_value])

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
    const { error } = await supabase.from('valuations').insert({
      project_id: project.id,
      week_label: weekLabel.trim(),
      description: description.trim(),
      contract_value: contractNum,
      percent_complete: pctWeek,
      cumulative_percent: cumPct,
      amount_due: amount,
      cumulative_total: 0,
      status: lineStatus,
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
      setRows(data as ValuationRecord[])
    }
  }

  const totalContractCol = filteredRows.reduce(
    (s, r) => s + num(r.contract_value),
    0,
  )
  const avgPctWeek = weightedValuePercent(filteredRows, pctThisWeek)
  const avgPctCum = weightedValuePercent(filteredRows, pctCumulative)

  const summaryTile = (
    label: string,
    value: string,
    hint?: string,
    highlight?: boolean,
  ) => (
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
          background: highlight
            ? accent
            : border,
        }}
        aria-hidden
      />
      <p className="pl-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </p>
      <p
        className={`mt-2 pl-2 font-semibold tabular-nums tracking-tight ${highlight ? 'text-2xl sm:text-[1.65rem]' : 'text-xl sm:text-2xl'}`}
        style={highlight ? { color: accent } : { color: '#F8FAFC' }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 pl-2 text-xs text-[#475569]">{hint}</p>
      ) : null}
    </div>
  )

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
                INTERIM VALUATION
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
                Summary
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[#64748B]">
                Contract position, this period’s certificate, paid-to-date, and
                balance outstanding across all valuation periods.
              </p>
            </div>
            {projectCvHint(project, lineValueSum)}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryTile(
              'Contract sum',
              contractSum > 0 ? formatMoneyGBP(contractSum) : '—',
              project.contract_value != null
                ? 'From project record'
                : lineValueSum > 0
                  ? 'Sum of BOQ lines (this period)'
                  : 'Set project contract value or add lines',
              true,
            )}
            {summaryTile(
              'Paid to date',
              formatMoneyGBP(paidToDate),
              'Sum of lines marked paid (all periods)',
            )}
            {summaryTile(
              'This week certificate',
              formatMoneyGBP(thisWeekCertificate),
              activePeriod
                ? `Sum of amount due · ${activePeriod}`
                : 'Select a period below',
            )}
            {summaryTile(
              'Outstanding',
              contractSum > 0 ? formatMoneyGBP(outstanding) : '—',
              'Contract sum less paid to date',
            )}
          </div>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
                Weekly valuation — trades / BOQ
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                One row per trade or item for the selected certificate period.
              </p>
            </div>
            {weekOpts.length > 0 ? (
              <div className="flex flex-col gap-1.5 sm:items-end">
                <label
                  htmlFor="val-week-filter"
                  className="text-[11px] font-semibold tracking-wider text-[#64748B]"
                >
                  PERIOD
                </label>
                <select
                  id="val-week-filter"
                  value={activePeriod ?? ''}
                  onChange={(e) =>
                    setPeriodOverride(e.target.value || null)
                  }
                  className={`${inputClass} min-w-[220px]`}
                >
                  {weekOpts.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {loadError ? (
            <div
              className="mt-4 rounded-lg border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              Could not load valuations: {loadError}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-10 text-center text-sm text-[#64748B]">
              Loading valuations…
            </p>
          ) : !loadError && rows.length === 0 ? (
            <div
              className="mt-6 rounded-lg border border-dashed px-6 py-14 text-center"
              style={{ borderColor: border, backgroundColor: '#080A0F' }}
            >
              <p className="text-sm font-medium text-[#94A3B8]">
                No valuation lines yet.
              </p>
              <p className="mt-2 text-sm text-[#64748B]">
                Add trade lines for a period using the form below.
              </p>
            </div>
          ) : !loadError && filteredRows.length === 0 ? (
            <div
              className="mt-6 rounded-lg border border-dashed px-6 py-12 text-center"
              style={{ borderColor: border, backgroundColor: '#080A0F' }}
            >
              <p className="text-sm text-[#94A3B8]">
                No lines for this period. Switch period or add lines.
              </p>
            </div>
          ) : !loadError ? (
            <div className="mt-6 overflow-x-auto rounded-xl border border-[#1E2535] shadow-[inset_0_1px_0_0_rgba(244,166,35,0.06)]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]"
                    style={{
                      borderColor: border,
                      background:
                        'linear-gradient(180deg, #121722 0%, #0c0f16 100%)',
                    }}
                  >
                    <th className="px-4 py-4 pl-5">Description</th>
                    <th className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      Contract value
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      % this week
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                      Amount this week
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 pr-5 text-right tabular-nums">
                      Cumulative %
                    </th>
                    <th className="whitespace-nowrap px-4 py-4">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2535]">
                  {filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-[#121722]/90"
                    >
                      <td className="max-w-[280px] px-4 py-3.5 pl-5 text-[#E2E8F8]">
                        <span className="font-medium text-[#F1F5F9]">
                          {r.description?.trim() ? r.description : '—'}
                        </span>
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-medium tabular-nums"
                        style={{ color: accent }}
                      >
                        {r.contract_value != null
                          ? formatMoneyGBP(num(r.contract_value))
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-[#E2E8F8]">
                        {formatPercent(r.percent_complete)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-[#E2E8F8]">
                        {formatMoneyGBP(num(r.amount_due))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 pr-5 text-right text-sm font-semibold tabular-nums text-[#F8FAFC]">
                        {formatPercent(r.cumulative_percent)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <ValuationStatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                  <tr
                    className="border-t-2 font-semibold"
                    style={{
                      borderTopColor: accent,
                      backgroundColor: 'rgba(244, 166, 35, 0.06)',
                    }}
                  >
                    <td className="px-4 py-4 pl-5 text-[#F8FAFC]">Total</td>
                    <td
                      className="whitespace-nowrap px-4 py-4 text-right tabular-nums"
                      style={{ color: accent }}
                    >
                      {formatMoneyGBP(totalContractCol)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[#E2E8F8]">
                      {avgPctWeek != null
                        ? formatPercentDisplay(avgPctWeek)
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[#F8FAFC]">
                      {formatMoneyGBP(thisWeekCertificate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 pr-5 text-right tabular-nums text-[#F8FAFC]">
                      {avgPctCum != null ? formatPercentDisplay(avgPctCum) : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#64748B]">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="rounded-xl border p-5 sm:p-7"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider text-[#64748B]"
          id="add-valuation-heading"
        >
          Add valuation line
        </h3>
        <p className="mt-1 text-sm text-[#64748B]">
          Enter the trade or BOQ item for this certificate period. Cumulative % is
          the overall progress on that line.
        </p>

        <form
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={handleAdd}
          aria-labelledby="add-valuation-heading"
        >
          <div>
            <label
              htmlFor="val-week"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              VALUATION PERIOD
            </label>
            <input
              id="val-week"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="e.g. Week 12 · 31 Mar – 6 Apr"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="val-desc"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              DESCRIPTION (TRADE / ITEM)
            </label>
            <input
              id="val-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electrical 2nd fix"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="val-contract"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              CONTRACT VALUE (£)
            </label>
            <input
              id="val-contract"
              type="number"
              min={0}
              step="0.01"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              placeholder="Line value"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="val-pct-week"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              % COMPLETE THIS WEEK
            </label>
            <input
              id="val-pct-week"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={percentThisWeekInput}
              onChange={(e) => setPercentThisWeekInput(e.target.value)}
              placeholder="0–100"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="val-amt-week"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              AMOUNT THIS WEEK (£)
            </label>
            <input
              id="val-amt-week"
              type="number"
              step="0.01"
              value={amountThisWeek}
              onChange={(e) => setAmountThisWeek(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="val-cum-pct"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              CUMULATIVE %
            </label>
            <input
              id="val-cum-pct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={cumulativePercentInput}
              onChange={(e) => setCumulativePercentInput(e.target.value)}
              placeholder="0–100"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="val-status"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
            >
              PAYMENT STATUS
            </label>
            <select
              id="val-status"
              value={lineStatus}
              onChange={(e) =>
                setLineStatus(e.target.value as 'paid' | 'unpaid')
              }
              className={inputClass}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {formError ? (
            <p
              className="sm:col-span-2 lg:col-span-3 text-sm text-red-400"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {saving ? 'Saving…' : 'Add valuation line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function projectCvHint(project: ProjectDetail, lineValueSum: number) {
  if (project.contract_value != null) return null
  if (lineValueSum <= 0) return null
  return (
    <p className="max-w-xs text-right text-xs text-[#64748B]">
      Project contract sum not set — using sum of BOQ lines in the selected
      period ({formatMoneyGBP(lineValueSum)}) until a project value is stored.
    </p>
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
        setValuationRows((data ?? []) as ValuationRecord[])
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
        setRows((data ?? []) as ValuationRecord[])
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
