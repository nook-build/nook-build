'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  formatIsoDateOnly,
  formatMoneyGBP,
  formatPercentDisplay,
} from '@/lib/format'
import { supabase } from '@/lib/supabase'

const accent = '#F4A623'
const border = '#1E2535'
const surface = '#0F1219'

export type ProjectDetail = {
  id: string
  name: string | null
  address: string | null
  contract_value: number | null
  start_date: string | null
  status: string | null
}

const TABS = [
  'Overview',
  'Documents',
  'Photos',
  'Messages',
  'Valuation',
  'Variations',
  'Delays',
  'Snags',
  'Tasks',
  'Invoices',
] as const

type TabId = (typeof TABS)[number]

function StatusPill({ status }: { status: string | null }) {
  const s = (status ?? '—').toLowerCase()
  const active = s === 'active'
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-[#1E2535] bg-[#080A0F] text-[#94A3B8]'
      }`}
    >
      {status ?? '—'}
    </span>
  )
}

function OverviewPanel({ project }: { project: ProjectDetail }) {
  const startLabel = formatIsoDateOnly(project.start_date)

  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Project name', value: project.name ?? 'Untitled project' },
    { label: 'Site address', value: project.address ?? '—' },
    {
      label: 'Contract value',
      value:
        project.contract_value != null ? (
          <span style={{ color: accent }} className="font-semibold tabular-nums">
            {formatMoneyGBP(Number(project.contract_value))}
          </span>
        ) : (
          '—'
        ),
    },
    { label: 'Start date', value: startLabel },
    {
      label: 'Status',
      value: <StatusPill status={project.status} />,
    },
  ]

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-6 sm:p-8"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <div
        className="absolute left-0 top-0 h-0.5 w-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
        aria-hidden
      />
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
        Project details
      </h2>
      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              {row.label}
            </dt>
            <dd className="mt-2 text-sm text-[#E2E8F8]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
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

export function ProjectTabs({ project }: { project: ProjectDetail }) {
  const [active, setActive] = useState<TabId>('Overview')

  return (
    <div>
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
            Workspace
          </h2>
          <p className="text-xs text-[#475569]">Jump to a section</p>
        </div>
        <div
          className="rounded-xl border p-3 sm:p-4"
          style={{ borderColor: border, backgroundColor: surface }}
        >
          <nav
            className="flex flex-wrap gap-2 sm:gap-2.5"
            role="tablist"
            aria-label="Project sections"
          >
            {TABS.map((tab) => {
              const isActive = active === tab
              const panelId = `panel-${tab}`
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  onClick={() => setActive(tab)}
                  className={`min-h-[44px] shrink-0 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1219] ${
                    isActive
                      ? 'border-transparent text-black shadow-[0_4px_24px_-6px_rgba(244,166,35,0.55)]'
                      : 'border-[#1E2535] bg-[#080A0F] text-[#94A3B8] hover:border-[#2d3a52] hover:bg-[#121722] hover:text-[#E2E8F8]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: accent }
                      : undefined
                  }
                >
                  {tab}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
      >
        {active === 'Overview' ? (
          <OverviewPanel project={project} />
        ) : active === 'Valuation' ? (
          <ValuationTab project={project} />
        ) : (
          <PlaceholderPanel title={active} />
        )}
      </div>
    </div>
  )
}
