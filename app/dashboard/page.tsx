import { redirect } from 'next/navigation'
import {
  formatInstantAsDate,
  formatIsoDateOnly,
  formatMoneyGBP,
} from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { NewProjectButton } from './new-project-button'
import { ProjectTableRow } from './project-table-row'

const accent = '#F4A623'
const green = '#00E676'
const blue = '#3B8BFF'
const warning = '#FF3D57'
const bg = '#0A0C10'
const surface = '#0F1219'
const border = '#1E2535'

type ProjectRow = {
  id: string
  name: string | null
  address: string | null
  contract_value: number | null
  start_date: string | null
  status: string | null
  created_at: string | null
}

function isActiveStatus(status: string | null | undefined) {
  return (status ?? '').toLowerCase() === 'active'
}

export default async function DashboardPage() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('role, project_id').eq('id', user.id).maybeSingle()
    if (profile?.role === 'client' && profile?.project_id) {
      redirect('/project/' + profile.project_id)
    }
  }
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, address, contract_value, start_date, status, created_at')
    .order('created_at', { ascending: false })

  const projects = (data ?? []) as ProjectRow[]
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => isActiveStatus(p.status)).length
  const totalValue = projects.reduce(
    (sum, p) => sum + (typeof p.contract_value === 'number' ? p.contract_value : 0),
    0,
  )

  return (
    <div
      className="min-h-screen text-[#E2E8F8]"
      style={{ backgroundColor: bg }}
    >
      {/* subtle site grid */}
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
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-start gap-4">
            <div
              className="hidden h-12 w-1 shrink-0 rounded-full sm:block"
              style={{ backgroundColor: accent }}
            />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.25em] text-[#64748B]">
                CONSTRUCTION MANAGEMENT
              </p>
              <h1 className="mt-1 font-semibold tracking-tight text-[#F8FAFC]">
                <span style={{ color: accent }}>Nook Build</span>
                <span className="text-[#64748B]"> · </span>
                <span className="font-normal text-[#94A3B8]">Project control</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm text-[#64748B]">
                Live portfolio of active and planned worksites. Track contract value
                and status across your programme.
              </p>
            </div>
          </div>
          <NewProjectButton />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {error ? (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: `${warning}66`,
              backgroundColor: `${warning}1A`,
              color: '#E2E8F8',
            }}
            role="alert"
          >
            Could not load projects: {error.message}
          </div>
        ) : (
          <>
            <section className="mb-10 grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total projects"
                value={String(totalProjects)}
                hint="In portfolio"
                valueColor={accent}
              />
              <StatCard
                label="Active sites"
                value={String(activeProjects)}
                hint="Status: active"
                valueColor={green}
              />
              <StatCard
                label="Total contract value"
                value={formatMoneyGBP(totalValue)}
                hint="Sum of recorded values"
                valueColor={blue}
                valueLarge
              />
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
                  All projects
                </h2>
                <span className="text-xs text-[#475569]">
                  {totalProjects} record{totalProjects === 1 ? '' : 's'}
                </span>
              </div>

              {totalProjects === 0 ? (
                <div
                  className="rounded-xl border border-dashed px-8 py-16 text-center"
                  style={{ borderColor: border, backgroundColor: surface }}
                >
                  <p className="text-sm font-medium text-[#94A3B8]">
                    No projects in the system yet.
                  </p>
                  <p className="mt-2 text-sm text-[#64748B]">
                    Use <span style={{ color: accent }}>+ New Project</span> to add
                    your first site.
                  </p>
                </div>
              ) : (
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: border, backgroundColor: surface }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr
                          className="border-b text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
                          style={{ borderColor: border }}
                        >
                          <th className="px-5 py-3.5">Project</th>
                          <th className="hidden px-5 py-3.5 md:table-cell">Site</th>
                          <th className="hidden px-5 py-3.5 sm:table-cell">Start</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right tabular-nums">
                            Contract
                          </th>
                          <th className="hidden px-5 py-3.5 text-right text-[#64748B] lg:table-cell">
                            Logged
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2535]">
                        {projects.map((p) => (
                          <ProjectTableRow
                            key={p.id}
                            id={p.id}
                            label={p.name ?? 'Untitled project'}
                          >
                            <td className="px-5 py-4">
                              <p className="font-medium text-[#F1F5F9]">
                                {p.name ?? 'Untitled project'}
                              </p>
                              <p className="mt-0.5 text-xs text-[#64748B] md:hidden">
                                {p.address ?? '—'}
                              </p>
                            </td>
                            <td className="hidden max-w-[240px] truncate px-5 py-4 text-[#94A3B8] md:table-cell">
                              {p.address ?? '—'}
                            </td>
                            <td className="hidden whitespace-nowrap px-5 py-4 text-[#94A3B8] sm:table-cell">
                              {formatIsoDateOnly(p.start_date)}
                            </td>
                            <td className="px-5 py-4">
                              <StatusPill status={p.status} />
                            </td>
                            <td
                              className="px-5 py-4 text-right text-sm font-semibold tabular-nums"
                              style={{ color: accent }}
                            >
                              {p.contract_value != null
                                ? formatMoneyGBP(Number(p.contract_value))
                                : '—'}
                            </td>
                            <td className="hidden px-5 py-4 text-right text-xs text-[#475569] lg:table-cell">
                              {formatInstantAsDate(p.created_at)}
                            </td>
                          </ProjectTableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  valueColor,
  valueLarge,
}: {
  label: string
  value: string
  hint: string
  valueColor: string
  valueLarge?: boolean
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border px-5 py-5"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <div
        className="absolute left-0 top-0 h-0.5 w-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${valueColor}, transparent)`,
        }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </p>
      <p
        className={`mt-2 font-bold tracking-tight ${valueLarge ? 'text-3xl sm:text-4xl' : 'text-3xl'}`}
        style={{ color: valueColor }}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-[#475569]">{hint}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string | null }) {
  const s = (status ?? '—').toLowerCase()
  const active = s === 'active'
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
        active
          ? ''
          : 'border-[#1E2535] bg-[#0A0C10] text-[#94A3B8]'
      }`}
      style={
        active
          ? {
              borderColor: '#00E67666',
              backgroundColor: '#00E6761A',
              color: '#00E676',
            }
          : undefined
      }
    >
      {status ?? '—'}
    </span>
  )
}