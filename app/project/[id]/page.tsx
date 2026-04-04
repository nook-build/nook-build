import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProjectTabs, type ProjectDetail } from './project-tabs'

const accent = '#F4A623'
const bg = '#080A0F'
const surface = '#0F1219'
const border = '#1E2535'

function HeaderStatusPill({ status }: { status: string | null }) {
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

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, address, contract_value, start_date, status')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <div
        className="min-h-screen text-[#E2E8F8]"
        style={{ backgroundColor: bg }}
      >
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div
            className="rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            Could not load project: {error.message}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    notFound()
  }

  const project = data as ProjectDetail

  return (
    <div
      className="min-h-screen text-[#E2E8F8]"
      style={{ backgroundColor: bg }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(${border} 1px, transparent 1px),
            linear-gradient(90deg, ${border} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <header
        className="relative border-b"
        style={{ borderColor: border, backgroundColor: surface }}
      >
        <div
          className="absolute left-0 top-0 h-0.5 w-full opacity-90"
          style={{
            background: `linear-gradient(90deg, ${accent}, transparent 55%)`,
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8 sm:pb-10 sm:pt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition hover:border-[#2d3a52] hover:bg-[#121722] hover:text-[#E2E8F8]"
            style={{ borderColor: border }}
          >
            <span className="text-[#64748B]" aria-hidden>
              ←
            </span>
            Dashboard
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-5 min-w-0">
              <div
                className="hidden h-[4.5rem] w-1 shrink-0 rounded-full sm:block"
                style={{ backgroundColor: accent }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-[0.25em] text-[#64748B]">
                  PROJECT WORKSPACE
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight text-[#F8FAFC] sm:text-4xl lg:text-5xl">
                  {project.name ?? 'Untitled project'}
                </h1>
                {project.address ? (
                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#94A3B8] sm:text-lg">
                    {project.address}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="flex shrink-0 flex-col gap-2 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:gap-6"
              style={{ borderColor: border, backgroundColor: bg }}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Status
                </p>
                <div className="mt-2">
                  <HeaderStatusPill status={project.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <ProjectTabs project={project} />
      </main>
    </div>
  )
}
