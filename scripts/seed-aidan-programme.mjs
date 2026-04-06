/**
 * One-off seed: Aidan programme trades for a single project.
 * Run: node --env-file=.env.local scripts/seed-aidan-programme.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

import { createClient } from '@supabase/supabase-js'

const PROJECT_ID = '5bb2db90-a0c6-4fe5-8627-04662bc29434'

const PHASE = {
  p1: 'Phase 1 Groundworks',
  p2: 'Phase 2 Internal Works',
  p3: 'Phase 3 Finishes',
}

const COLOUR = {
  p1: '#F4A623',
  p2: '#3B8BFF',
  p3: '#00BFA5',
}

/** Aidan programme: 43 named trades (22 + 7 + 14). */
const TRADES = [
  // Phase 1 — 22
  { phase: PHASE.p1, trade_name: 'Lift Hire', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Site WC', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Preparation and Protection', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Demolition', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Drainage', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Pad Foundation', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Strip Foundation', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Cavity Walls DPC', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Internal Stud walls', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'External Walls Bricks', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Timber Beams', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Steel Beams', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Dormer Walls Inside', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Dormer Walls Exterior', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Beam boxing', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Roof Structure Extension', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Roof Covering', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'GRP', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Roof Insulation', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Scaffolding', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Gutters', colour: COLOUR.p1 },
  { phase: PHASE.p1, trade_name: 'Dormer cladding', colour: COLOUR.p1 },
  // Phase 2 — 7
  { phase: PHASE.p2, trade_name: 'Windows and Doors', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Electric 1st fix', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Plumbing 1st fix', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Concrete Floor', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Screed', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Insulation', colour: COLOUR.p2 },
  { phase: PHASE.p2, trade_name: 'Boarding', colour: COLOUR.p2 },
  // Phase 3 — 14
  { phase: PHASE.p3, trade_name: 'Plastering', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Electric 2nd fix', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Plumbing 2nd fix', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Cylinder', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Internal Doors', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Skirting', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Architraves', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'MDF wall panels', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Floor tiles', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Rendering and Insulation', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Painting', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Glass Balustrade', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Stairs balustrade', colour: COLOUR.p3 },
  { phase: PHASE.p3, trade_name: 'Paving Slabs', colour: COLOUR.p3 },
]

function weeksForIndex(i, total, maxWeek = 26) {
  const start_week = 1 + Math.floor((i * (maxWeek - 2)) / Math.max(1, total - 1))
  const end_week = Math.min(start_week + 1, maxWeek)
  return { start_week, end_week }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const total = TRADES.length

  const { error: delErr } = await supabase
    .from('programme_items')
    .delete()
    .eq('project_id', PROJECT_ID)

  if (delErr) {
    console.error('Delete existing programme_items failed:', delErr.message)
    process.exit(1)
  }

  const rows = TRADES.map((t, i) => {
    const { start_week, end_week } = weeksForIndex(i, total)
    return {
      project_id: PROJECT_ID,
      trade_name: t.trade_name,
      phase: t.phase,
      start_week,
      end_week,
      percent_complete: 0,
      status: 'not_started',
      colour: t.colour,
    }
  })

  const { data, error } = await supabase.from('programme_items').insert(rows).select('id')

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`Inserted ${data?.length ?? rows.length} programme_items for project ${PROJECT_ID}`)
}

main()
