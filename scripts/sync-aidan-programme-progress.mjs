/**
 * Sync Aidan programme_items progress/status from portal Gantt source data.
 *
 * Source of truth: /Users/catalinopris/Downloads/index.html
 * Reads: PROJ_START, TC, ITEMS, FILE_DEP, FILE_D2, FILE_D3
 * Computes progress exactly like portal renderProgramme():
 *   progPct = min(100, (drawnUpTo(it.name, 99) / it.total) * 100)
 *
 * Status mapping:
 * - 100% => complete
 * - 1-99% => active
 * - 0% => not_started
 *
 * Also updates projects.locked_items_count = count(complete trades).
 */

import { createClient } from '@supabase/supabase-js'
import { createContext, runInContext } from 'node:vm'
import fs from 'fs'
import path from 'path'

const PROJECT_ID = '5bb2db90-a0c6-4fe5-8627-04662bc29434'

function loadPortalHtml() {
  const envPath = process.env.PORTAL_VALUATION_HTML
  const candidates = [
    envPath,
    path.join(process.env.HOME || '', 'Downloads/index.html'),
    '/Users/catalinopris/Downloads/index.html',
  ].filter(Boolean)

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
    } catch {
      /* ignore */
    }
  }
  throw new Error('Could not find portal index.html')
}

function extractPortalData(html) {
  const start = html.indexOf('const CONTRACT = ')
  const end = html.indexOf('// State', start)
  if (start < 0 || end < 0) {
    throw new Error('Could not locate programme data block in index.html')
  }

  const block = html.slice(start, end)
  const sandbox = { Date, Math }
  const ctx = createContext(sandbox)
  runInContext(
    `${block}\nthis.__DATA = { PROJ_START, TC, ITEMS, FILE_DEP, FILE_D2, FILE_D3 };`,
    ctx,
  )

  const data = sandbox.__DATA
  if (!data || !Array.isArray(data.ITEMS) || data.ITEMS.length !== 44) {
    throw new Error(`Expected 44 ITEMS, got ${data?.ITEMS?.length ?? 0}`)
  }
  return data
}

function msDay(n) {
  return n * 86400000
}

function weekFromDate(isoDate, projStartDate) {
  const d = new Date(isoDate)
  const diffDays = Math.floor((d - projStartDate) / msDay(1))
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

function buildProgrammeRows(data) {
  const projStart = new Date(data.PROJ_START)

  // Portal only sets phase on first row in each block. Carry forward.
  let currentPhase = 'Phase 1 — Groundworks & Structure'

  const rows = []
  for (const item of data.ITEMS) {
    if (item.phase) currentPhase = item.phase

    const d1 = data.FILE_DEP[item.name] ?? 0
    const d2 = data.FILE_D2[item.name] ?? 0
    const d3 = data.FILE_D3[item.name] ?? 0
    const cumul = d1 + d2 + d3

    const rawPct = item.total > 0 ? (cumul / item.total) * 100 : 0
    const percent_complete = Math.min(100, Math.round(rawPct * 10) / 10)

    let status = 'not_started'
    if (percent_complete >= 100) status = 'complete'
    else if (percent_complete > 0) status = 'active'

    const start_week = item.gs ? weekFromDate(item.gs, projStart) : 1
    const end_week = item.ge ? weekFromDate(item.ge, projStart) : start_week

    rows.push({
      project_id: PROJECT_ID,
      trade_name: item.name,
      phase: currentPhase,
      start_week,
      end_week,
      percent_complete,
      status,
      colour: data.TC[item.type]?.tx ?? '#8899AA',
    })
  }

  return rows
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const html = loadPortalHtml()
  const data = extractPortalData(html)
  const rows = buildProgrammeRows(data)

  const completeCount = rows.filter((r) => r.percent_complete >= 100).length

  const supabase = createClient(url, key)

  const { error: delErr } = await supabase
    .from('programme_items')
    .delete()
    .eq('project_id', PROJECT_ID)
  if (delErr) {
    console.error('Delete programme_items failed:', delErr.message)
    process.exit(1)
  }

  const { error: insErr } = await supabase.from('programme_items').insert(rows)
  if (insErr) {
    console.error('Insert programme_items failed:', insErr.message)
    process.exit(1)
  }

  const { error: projErr } = await supabase
    .from('projects')
    .update({ locked_items_count: completeCount })
    .eq('id', PROJECT_ID)
  if (projErr) {
    console.error('Update projects.locked_items_count failed:', projErr.message)
    process.exit(1)
  }

  console.log(
    `Synced ${rows.length} programme_items for ${PROJECT_ID}; complete=${completeCount}, active=${rows.filter(r=>r.status==='active').length}, not_started=${rows.filter(r=>r.status==='not_started').length}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
