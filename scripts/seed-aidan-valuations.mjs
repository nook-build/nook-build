/**
 * One-off seed: Aidan valuation lines from the client portal HTML.
 * Reads the same source as `initData()` in index.html: ITEMS + FILE_DEP, FILE_D2, FILE_D3
 * (exact per-trade amounts and percentages). Week 4 is inserted with zero this-week claim
 * (cumulative unchanged), matching the portal “pending” week after WK3.
 *
 * Run: node --env-file=.env.local scripts/seed-aidan-valuations.mjs
 * Optional: PORTAL_VALUATION_HTML=/path/to/index.html
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Production DB: legacy columns (week_number, item_name, amount, percentage).
 */

import { createClient } from '@supabase/supabase-js'
import { createContext, runInContext } from 'node:vm'
import fs from 'fs'
import path from 'path'

const PROJECT_ID = '5bb2db90-a0c6-4fe5-8627-04662bc29434'

/** Same rounding as portal: Math.round((amt/total)*100*10)/10 */
function pctThisWeek(amt, total) {
  return total > 0 ? Math.round((amt / total) * 100 * 10) / 10 : 0
}

/** Cumulative % of contract after summing week amounts (portal-style rounding). */
function cumDrawnPct(total, a1, a2, a3) {
  const s = (a1 || 0) + (a2 || 0) + (a3 || 0)
  return total > 0 ? Math.round((s / total) * 100 * 10) / 10 : 0
}

const CREATED_AT = {
  1: '2026-03-10T12:00:00.000Z',
  2: '2026-03-17T12:00:00.000Z',
  3: '2026-03-24T12:00:00.000Z',
  4: '2026-03-31T12:00:00.000Z',
}

/**
 * Evaluates `const ITEMS` … `const FILE_D3` block from portal HTML (same as initData inputs).
 */
function extractPortalValuationData(html) {
  const start = html.indexOf('const ITEMS = ')
  const end = html.indexOf('function initData()', start)
  if (start < 0 || end < 0) {
    throw new Error('Portal HTML missing ITEMS block or initData()')
  }
  const block = html.slice(start, end)
  const sandbox = {}
  const ctx = createContext(sandbox)
  runInContext(
    block +
      '\nthis.__ITEMS = ITEMS; this.__FILE_DEP = FILE_DEP; this.__FILE_D2 = FILE_D2; this.__FILE_D3 = FILE_D3;',
    ctx,
  )
  const { __ITEMS: ITEMS, __FILE_DEP: FILE_DEP, __FILE_D2: FILE_D2, __FILE_D3: FILE_D3 } =
    sandbox
  if (!Array.isArray(ITEMS) || ITEMS.length !== 44) {
    throw new Error(`Expected ITEMS length 44, got ${ITEMS?.length}`)
  }
  return { ITEMS, FILE_DEP, FILE_D2, FILE_D3 }
}

function loadPortalHtml() {
  const envPath = process.env.PORTAL_VALUATION_HTML
  const candidates = [
    envPath,
    path.join(process.env.HOME || '', 'Downloads/index.html'),
    '/Users/catalinopris/Downloads/index.html',
  ].filter(Boolean)

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf8')
      }
    } catch {
      /* continue */
    }
  }
  throw new Error(
    'Portal HTML not found. Set PORTAL_VALUATION_HTML or place index.html in ~/Downloads/',
  )
}

function buildRows({ ITEMS, FILE_DEP, FILE_D2, FILE_D3 }) {
  const rows = []

  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i]
    const name = it.name
    const cv = it.total
    const d1 = FILE_DEP[name] ?? 0
    const d2 = FILE_D2[name] ?? 0
    const d3 = FILE_D3[name] ?? 0
    const d4 = 0

    const lineOrder = i + 1

    const w1Pct = pctThisWeek(d1, cv)
    const w1Cum = cumDrawnPct(cv, d1, 0, 0)

    const w2Pct = pctThisWeek(d2, cv)
    const w2Cum = cumDrawnPct(cv, d1, d2, 0)

    const w3Pct = pctThisWeek(d3, cv)
    const w3Cum = cumDrawnPct(cv, d1, d2, d3)

    const w4Pct = 0
    const w4Cum = w3Cum

    const weeks = [
      [1, d1, w1Pct, w1Cum, CREATED_AT[1]],
      [2, d2, w2Pct, w2Cum, CREATED_AT[2]],
      [3, d3, w3Pct, w3Cum, CREATED_AT[3]],
      [4, d4, w4Pct, w4Cum, CREATED_AT[4]],
    ]

    for (const [weekNum, amount, percentage, cumulative_percent, created_at] of weeks) {
      rows.push({
        project_id: PROJECT_ID,
        week_number: weekNum,
        item_name: name,
        contract_value: cv,
        percentage,
        cumulative_percent,
        amount,
        locked: false,
        line_order: lineOrder,
        created_at,
      })
    }
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
  const data = extractPortalValuationData(html)
  const rows = buildRows(data)

  const supabase = createClient(url, key)

  const { error: delErr } = await supabase
    .from('valuations')
    .delete()
    .eq('project_id', PROJECT_ID)

  if (delErr) {
    console.error('Delete existing valuations failed:', delErr.message)
    process.exit(1)
  }

  const batchSize = 80
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('valuations').insert(chunk)
    if (error) {
      console.error('Insert failed:', error.message)
      process.exit(1)
    }
  }

  let sum1 = 0
  let sum2 = 0
  let sum3 = 0
  for (const it of data.ITEMS) {
    sum1 += data.FILE_DEP[it.name] ?? 0
    sum2 += data.FILE_D2[it.name] ?? 0
    sum3 += data.FILE_D3[it.name] ?? 0
  }

  console.log(
    `Inserted ${rows.length} valuation rows (44 lines × 4 weeks) for project ${PROJECT_ID}`,
  )
  console.log(
    `Week certs (from FILE_*): W1 £${sum1.toFixed(2)} · W2 £${sum2.toFixed(2)} · W3 £${sum3.toFixed(2)}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
