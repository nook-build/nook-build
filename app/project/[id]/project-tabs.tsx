'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
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

function ProgrammeTab({ project }: { project: ProjectDetail }) {
  const [rows, setRows] = useState<ProgrammeSeed[]>(PROGRAMME_SEED)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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

  const todayWeek = useMemo(() => {
    if (!project.start_date) return null
    const startMs = utcMillisFromIsoDate(project.start_date)
    if (startMs == null) return null
    const nowMs = todayUtcMidnightMs()
    const elapsedDays = (nowMs - startMs) / 86400000
    return Math.max(1, Math.floor(elapsedDays / 7) + 1)
  }, [project.start_date])

  const todayLineLeftPct = useMemo(() => {
    if (todayWeek == null) return null
    if (weekRange.length === 0) return null
    const span = maxWeek - minWeek + 1
    if (span <= 0) return null
    const pos = ((todayWeek - minWeek + 0.5) / span) * 100
    return Math.max(0, Math.min(100, pos))
  }, [todayWeek, minWeek, maxWeek, weekRange.length])

  const sCurve = useMemo(() => {
    const points = weekRange.map((w) => {
      const total = rows.length || 1
      const plannedDone = rows.filter((r) => r.end_week <= w).length
      const actualDone = rows.filter(
        (r) => r.percent_complete >= 100 && r.end_week <= w,
      ).length
      return {
        week: w,
        planned: (plannedDone / total) * 100,
        actual: (actualDone / total) * 100,
      }
    })
    return points
  }, [rows, weekRange])

  function pctColor(pct: number) {
    if (pct >= 100) return '#00E676'
    if (pct > 0) return '#F4A623'
    return '#94A3B8'
  }

  return (
    <div className="space-y-8">
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div
          className="absolute left-0 top-0 h-0.5 w-full opacity-90"
          style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }}
          aria-hidden
        />
        <div className="p-5 sm:p-7">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
            PROGRAMME
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
            Programme + S-Curve
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            Gantt schedule by trade with completion status and weekly progress
            curve.
          </p>
          {loadError ? (
            <p className="mt-3 text-sm text-[#FF3D57]" role="alert">
              Could not load programme items: {loadError}. Showing sample programme.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div className="p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
              Gantt chart
            </h3>
            {loading ? <span className="text-xs text-[#64748B]">Loading…</span> : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1E2535]">
            <div className="min-w-[980px]">
              <div
                className="grid border-b border-[#1E2535] bg-[#111620]"
                style={{ gridTemplateColumns: `240px repeat(${weekRange.length}, minmax(38px, 1fr))` }}
              >
                <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Trade
                </div>
                {weekRange.map((w) => (
                  <div
                    key={`week-${w}`}
                    className="border-l border-[#1E2535] px-1 py-3 text-center text-[10px] font-semibold tracking-wider text-[#94A3B8]"
                  >
                    W{w}
                  </div>
                ))}
              </div>

              <div className="relative bg-[#080A0F]">
                {todayLineLeftPct != null ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 w-[2px]"
                    style={{
                      left: `calc(240px + (${todayLineLeftPct}% * (100% - 240px) / 100))`,
                      backgroundColor: '#FF3D57',
                    }}
                    aria-label="Today marker"
                  />
                ) : null}

                {grouped.map(([phase, items]) => (
                  <div key={phase} className="border-t border-[#1E2535] first:border-t-0">
                    <div className="bg-[#0C1018] px-4 py-2 text-xs font-semibold tracking-wide text-[#F4A623]">
                      {phase}
                    </div>
                    {items.map((item) => {
                      const startCol = item.start_week - minWeek + 2
                      const endCol = item.end_week - minWeek + 3
                      return (
                        <div
                          key={`${phase}-${item.trade_name}`}
                          className="grid border-t border-[#161b27]"
                          style={{ gridTemplateColumns: `240px repeat(${weekRange.length}, minmax(38px, 1fr))` }}
                        >
                          <div className="px-4 py-3">
                            <p className="text-sm font-medium text-[#E2E8F8]">{item.trade_name}</p>
                            <p className="mt-0.5 text-xs text-[#64748B]">
                              W{item.start_week} → W{item.end_week}
                            </p>
                          </div>
                          <div
                            className="relative col-span-full row-start-1 ml-[240px] grid h-full"
                            style={{ gridTemplateColumns: `repeat(${weekRange.length}, minmax(38px, 1fr))` }}
                          >
                            {weekRange.map((w) => (
                              <div key={`${item.trade_name}-cell-${w}`} className="border-l border-[#1E2535]" />
                            ))}
                            <div
                              className="z-10 mx-1 my-2 rounded-full border"
                              style={{
                                gridColumn: `${startCol - 1} / ${endCol - 1}`,
                                borderColor: `${item.colour}80`,
                                backgroundColor: `${item.colour}2B`,
                              }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, item.percent_complete))}%`,
                                  backgroundColor: item.colour,
                                }}
                              />
                            </div>
                            <div
                              className="z-20 mr-2 self-center justify-self-end text-xs font-semibold tabular-nums"
                              style={{ color: pctColor(item.percent_complete) }}
                            >
                              {Math.round(item.percent_complete)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div className="p-5 sm:p-7">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
            S-Curve
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Planned vs actual completion by week.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#1E2535] bg-[#080A0F] p-4">
            <svg viewBox="0 0 860 280" className="h-[280px] w-full min-w-[760px]">
              <rect x="0" y="0" width="860" height="280" fill="transparent" />
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = 20 + ((100 - tick) / 100) * 220
                return (
                  <g key={`y-${tick}`}>
                    <line x1="50" y1={y} x2="830" y2={y} stroke="#1E2535" strokeWidth="1" />
                    <text x="10" y={y + 4} fill="#64748B" fontSize="11">
                      {tick}%
                    </text>
                  </g>
                )
              })}
              {sCurve.length > 1 ? (
                <>
                  <polyline
                    fill="none"
                    stroke="#F4A623"
                    strokeWidth="3"
                    points={sCurve
                      .map((p, i) => {
                        const x = 50 + (i / (sCurve.length - 1)) * 780
                        const y = 20 + ((100 - p.planned) / 100) * 220
                        return `${x},${y}`
                      })
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="3"
                    points={sCurve
                      .map((p, i) => {
                        const x = 50 + (i / (sCurve.length - 1)) * 780
                        const y = 20 + ((100 - p.actual) / 100) * 220
                        return `${x},${y}`
                      })
                      .join(' ')}
                  />
                </>
              ) : null}
              {weekRange.map((w, i) => {
                const x = 50 + (i / Math.max(1, weekRange.length - 1)) * 780
                return (
                  <text key={`x-${w}`} x={x} y="268" textAnchor="middle" fill="#64748B" fontSize="10">
                    W{w}
                  </text>
                )
              })}
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-2 text-[#94A3B8]">
                <span className="h-2 w-6 rounded-full bg-[#F4A623]" />
                Planned
              </span>
              <span className="inline-flex items-center gap-2 text-[#94A3B8]">
                <span className="h-2 w-6 rounded-full bg-[#00E676]" />
                Actual
              </span>
            </div>
          </div>
        </div>
      </div>
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
