'use client'

import Link from 'next/link'
import { useState, type ComponentType } from 'react'
import {
  ProjectTabs,
  type PortalSection,
  type ProjectDetail,
} from './project-tabs'

const accent = '#F4A623'
const sidebarBg = '#0A0C10'
const border = '#1E2535'
const mainBg = '#080A0F'

const SECTION_HEADINGS: Record<PortalSection, string> = {
  'command-centre': 'Command Centre',
  documents: 'Documents',
  'site-photos': 'Site Photos',
  messages: 'Messages',
  'email-trail': 'Email Trail',
  'building-control': 'Building Control',
  invoices: 'Invoices',
  valuation: 'Valuation',
  cis: 'CIS',
  'task-board': 'Task Board',
  'team-hub': 'Team Hub',
  'snag-list': 'Snag List',
  'client-signoff': 'Client Sign-Off',
  'handover-pack': 'Handover Pack',
  'weekly-reports': 'Weekly Reports',
}

function IconCommand() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )
}
function IconDoc() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function IconPhoto() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function IconChat() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
function IconMail() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
function IconInvoice() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}
function IconList() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
function IconPen() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
function IconPackage() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
function IconReport() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

type NavItemDef = {
  id: PortalSection
  label: string
  Icon: ComponentType
}

const NAV_GROUPS: { heading: string; items: NavItemDef[] }[] = [
  {
    heading: 'OVERVIEW',
    items: [{ id: 'command-centre', label: 'Command Centre', Icon: IconCommand }],
  },
  {
    heading: 'FILES & MEDIA',
    items: [
      { id: 'documents', label: 'Documents', Icon: IconDoc },
      { id: 'site-photos', label: 'Site Photos', Icon: IconPhoto },
    ],
  },
  {
    heading: 'COMMUNICATION',
    items: [
      { id: 'messages', label: 'Messages', Icon: IconChat },
      { id: 'email-trail', label: 'Email Trail', Icon: IconMail },
    ],
  },
  {
    heading: 'COMPLIANCE',
    items: [{ id: 'building-control', label: 'Building Control', Icon: IconShield }],
  },
  {
    heading: 'FINANCE',
    items: [
      { id: 'invoices', label: 'Invoices', Icon: IconInvoice },
      { id: 'valuation', label: 'Valuation', Icon: IconChart },
      { id: 'cis', label: 'CIS', Icon: IconClipboard },
    ],
  },
  {
    heading: 'WORK',
    items: [{ id: 'task-board', label: 'Task Board', Icon: IconClipboard }],
  },
  {
    heading: 'TEAM',
    items: [{ id: 'team-hub', label: 'Team Hub', Icon: IconUsers }],
  },
  {
    heading: 'QUALITY',
    items: [
      { id: 'snag-list', label: 'Snag List', Icon: IconList },
      { id: 'client-signoff', label: 'Client Sign-Off', Icon: IconPen },
      { id: 'handover-pack', label: 'Handover Pack', Icon: IconPackage },
    ],
  },
  {
    heading: 'REPORTS',
    items: [{ id: 'weekly-reports', label: 'Weekly Reports', Icon: IconReport }],
  },
]

function NavButton({
  id,
  label,
  Icon,
  active,
  onSelect,
}: NavItemDef & {
  active: boolean
  onSelect: (id: PortalSection) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A623]/50 ${
        active
          ? 'text-[#F4A623] shadow-[inset_3px_0_0_0_#F4A623] bg-[#F4A623]/10'
          : 'text-[#94A3B8] hover:bg-[#12151c] hover:text-[#E2E8F8]'
      }`}
    >
      <Icon />
      <span className="min-w-0 leading-snug">{label}</span>
    </button>
  )
}

function ProjectStatusBadge({ status }: { status: string | null }) {
  const active = (status ?? '').toLowerCase() === 'active'
  if (!active) {
    return (
      <span className="inline-flex rounded border border-[#2a3142] bg-[#12151c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {status ?? '—'}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
      Active
    </span>
  )
}

export function ProjectPortalShell({ project }: { project: ProjectDetail }) {
  const [section, setSection] = useState<PortalSection>('command-centre')

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed left-0 top-0 z-50 flex h-screen w-[200px] flex-col border-r text-[#E2E8F8]"
        style={{
          backgroundColor: sidebarBg,
          borderColor: border,
        }}
      >
        <div className="border-b px-3 py-4" style={{ borderColor: border }}>
          <Link
            href="/dashboard"
            className="mb-3 block text-[11px] font-medium text-[#64748B] transition hover:text-[#94A3B8]"
          >
            ← Dashboard
          </Link>
          <div className="font-bold leading-tight tracking-tight">
            <span className="text-[#F8FAFC]">NOOK</span>{' '}
            <span style={{ color: accent }}>BUILD</span>
          </div>
          <p className="mt-3 line-clamp-2 text-xs font-medium leading-snug text-[#CBD5E1]">
            {project.name ?? 'Untitled project'}
          </p>
          <div className="mt-2">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-2.5 text-[9px] font-semibold tracking-[0.15em] text-[#64748B]">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavButton
                    key={item.id}
                    {...item}
                    active={section === item.id}
                    onSelect={setSection}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="mt-auto border-t px-3 py-3"
          style={{ borderColor: border }}
        >
          <a
            href="https://nook-build.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[11px] font-medium text-[#64748B] transition hover:text-[#94A3B8]"
          >
            nook-build.co.uk
          </a>
        </div>
      </aside>

      <div
        className="min-h-screen flex-1 pl-[200px]"
        style={{ backgroundColor: mainBg }}
      >
        <header
          className="sticky top-0 z-30 border-b px-6 py-4 backdrop-blur-sm"
          style={{
            borderColor: border,
            backgroundColor: 'rgba(8, 10, 15, 0.92)',
          }}
        >
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B]">
            PROJECT PORTAL
          </p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
            {SECTION_HEADINGS[section]}
          </h1>
        </header>

        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <ProjectTabs project={project} activeSection={section} />
        </div>
      </div>
    </div>
  )
}
