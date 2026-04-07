'use client'

import { useEffect, useState } from 'react'
import { formatMoneyGBP } from '@/lib/format'

export function ValuationThisWeekPctModal({
  open,
  onClose,
  tradeName,
  contractValueNum,
  initialPct,
  saving,
  onSave,
}: {
  open: boolean
  onClose: () => void
  tradeName: string
  contractValueNum: number
  initialPct: number
  saving: boolean
  onSave: (pct: number) => void | Promise<void>
}) {
  const [pctText, setPctText] = useState(() =>
    Number.isFinite(initialPct) ? String(initialPct) : '0',
  )

  useEffect(() => {
    if (open) {
      setPctText(Number.isFinite(initialPct) ? String(initialPct) : '0')
    }
  }, [open, initialPct])

  const parsed =
    pctText.trim() === '' || pctText.trim() === '.' || pctText.trim() === '-'
      ? 0
      : parseFloat(pctText.trim())
  const pctLive = Number.isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed))
  const thisWkPounds =
    Math.round(((pctLive / 100) * contractValueNum) * 100) / 100

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="val-pct-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#1E2535] bg-[#0F1219] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="val-pct-modal-title"
          className="mb-4 font-semibold leading-snug text-[#E2E8F8]"
        >
          {tradeName || '—'}
        </h2>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#64748B]">
          This Wk %
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={pctText}
          onChange={(e) => setPctText(e.target.value)}
          className="mb-3 w-full rounded-lg border border-[#1E2535] bg-[#080A0F] px-3 py-2 text-sm text-[#E2E8F8] outline-none focus:border-[#F4A623]/50"
          autoFocus
        />
        <div className="mb-5 text-sm text-[#94A3B8]">
          This Wk £:{' '}
          <span className="font-mono text-[#F4A623]">
            {formatMoneyGBP(thisWkPounds)}
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#1E2535] px-4 py-2 text-sm text-[#94A3B8] hover:bg-[#161B26]"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#F4A623] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            disabled={saving}
            onClick={() => void onSave(pctLive)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
