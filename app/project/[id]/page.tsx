import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProjectPortalShell } from './project-portal-shell'
import type { ProjectDetail } from './project-tabs'

const bg = '#080A0F'
const border = '#1E2535'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, name, address, postcode, contract_value, variations_total, start_date, handover_date, status, deposit_paid, total_delays_days, locked_items_count',
    )
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

      <ProjectPortalShell project={project} />
    </div>
  )
}
