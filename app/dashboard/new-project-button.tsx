'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const accent = '#F4A623'
const bg = '#0A0C10'
const surface = '#0F1219'
const border = '#1E2535'
const warning = '#FF3D57'

export function NewProjectButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [startDate, setStartDate] = useState('')

  function reset() {
    setName('')
    setAddress('')
    setContractValue('')
    setStartDate('')
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const value = parseFloat(contractValue)
    if (!name.trim()) {
      setFormError('Project name is required.')
      return
    }
    if (Number.isNaN(value) || value < 0) {
      setFormError('Enter a valid contract value.')
      return
    }
    if (!startDate) {
      setFormError('Start date is required.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('projects').insert({
      name: name.trim(),
      address: address.trim() || null,
      contract_value: value,
      start_date: startDate,
      status: 'active',
    })

    setSaving(false)
    if (error) {
      setFormError(error.message)
      return
    }

    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0C10]"
        aria-label="Create new project"
        style={{ backgroundColor: accent }}
      >
        <span className="text-lg leading-none">+</span>
        New Project
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={() => {
              if (!saving) {
                reset()
                setOpen(false)
              }
            }}
          />
          <div
            className="relative w-full max-w-md rounded-xl border p-6 shadow-2xl"
            style={{ backgroundColor: surface, borderColor: border }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="new-project-title"
              className="text-lg font-semibold tracking-tight"
              style={{ color: accent }}
            >
              New project
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Add a site to your portfolio. You can edit details later in Supabase
              or your admin tools.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="np-name"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
                >
                  PROJECT NAME
                </label>
                <input
                  id="np-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Riverside extension"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#E2E8F8] outline-none placeholder:text-[#475569]"
                  style={{ borderColor: border, backgroundColor: bg }}
                />
              </div>
              <div>
                <label
                  htmlFor="np-address"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
                >
                  SITE ADDRESS
                </label>
                <input
                  id="np-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, postcode"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#E2E8F8] outline-none placeholder:text-[#475569]"
                  style={{ borderColor: border, backgroundColor: bg }}
                />
              </div>
              <div>
                <label
                  htmlFor="np-value"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
                >
                  CONTRACT VALUE (£)
                </label>
                <input
                  id="np-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#E2E8F8] outline-none placeholder:text-[#475569]"
                  style={{ borderColor: border, backgroundColor: bg }}
                />
              </div>
              <div>
                <label
                  htmlFor="np-start"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#64748B]"
                >
                  START DATE
                </label>
                <input
                  id="np-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#E2E8F8] outline-none [color-scheme:dark]"
                  style={{ borderColor: border, backgroundColor: bg }}
                />
              </div>

              {formError ? (
                <p className="text-sm" style={{ color: warning }} role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    reset()
                    setOpen(false)
                  }}
                  className="flex-1 rounded-lg border border-[#1E2535] py-2.5 text-sm font-medium text-[#94A3B8] transition hover:bg-[#1a1f2e] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {saving ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
