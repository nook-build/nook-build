/**
 * One-off seed: Aidan valuation lines from the client portal HTML (VALUATION & DRAWDOWN).
 * Inserts 44 BOQ lines × 3 weeks (week_number 1–3) so prev-drawn and cumulative % match the portal.
 *
 * Run: node --env-file=.env.local scripts/seed-aidan-valuations.mjs
 * Optional: PORTAL_VALUATION_HTML=/path/to/index.html (defaults to ~/Downloads/index.html)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Note: Production DB uses legacy columns (week_number, item_name, amount, percentage).
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const PROJECT_ID = '5bb2db90-a0c6-4fe5-8627-04662bc29434'

/** Portal cumulative schedule (from index.html pg-cumulative). */
const WEEK_CERT_W1 = 22614
const WEEK_CERT_W2 = 25569

const CREATED_AT = {
  w1: '2026-03-10T12:00:00.000Z',
  w2: '2026-03-17T12:00:00.000Z',
  w3: '2026-03-24T12:00:00.000Z',
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Parse #v-tbody from portal HTML: description, contract, prev drawn, this-week %, cert £, cumulative %.
 */
function parseValuationTbody(html) {
  const start = html.indexOf('<tbody id="v-tbody">')
  const end = html.indexOf('</tbody>', start)
  if (start < 0 || end < 0) throw new Error('Could not find tbody#v-tbody')
  const chunk = html.slice(start, end)
  const trParts = chunk.split('<tr').slice(1).map((s) => '<tr' + s.split('</tr>')[0] + '</tr>')
  const items = []
  for (const tr of trParts) {
    if (tr.includes('ph-cell')) continue
    const lock = tr.match(/lockItem\(&#39;((?:&#39;|&amp;|[^&])+?)&#39;,\s*(\d+)\)/)
    if (!lock) continue
    const desc = lock[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    const money = [...tr.matchAll(/£([\d,]+)/g)].map((m) =>
      parseFloat(m[1].replace(/,/g, '')),
    )
    const contract = money[0]
    const prev = money[1]
    const inp = tr.match(/<input[^>]*class="pi[^"]*"[^>]*value="([^"]*)"/)
    const pctWeek = inp && inp[1] !== '' ? parseFloat(inp[1]) : 0
    const certM = tr.match(/id="cert_[^"]+"[^>]*>([^<]+)</)
    const certStr = certM ? certM[1].trim() : '—'
    let amtDue = 0
    if (certStr !== '—' && certStr !== '') {
      const cm = certStr.match(/£([\d,]+)/)
      amtDue = cm ? parseFloat(cm[1].replace(/,/g, '')) : 0
    }
    const cumM = tr.match(/✓ ([\d.]+)%/)
    const cumPct = cumM ? parseFloat(cumM[1]) : null
    items.push({ desc, contract, prev, pctWeek, amtDue, cumPct })
  }
  if (items.length !== 44) {
    throw new Error(`Expected 44 valuation lines, got ${items.length}`)
  }
  return items
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

function buildRows(portalLines) {
  const ratioW1 = WEEK_CERT_W1 / (WEEK_CERT_W1 + WEEK_CERT_W2)
  const rows = []
  let lineOrder = 0

  for (const line of portalLines) {
    lineOrder += 1
    const { desc, contract: cv, prev, pctWeek, amtDue, cumPct } = line
    const w1Amt = round2(prev * ratioW1)
    const w2Amt = round2(prev - w1Amt)

    const pctW1 = cv > 0 ? round2((w1Amt / cv) * 100) : 0
    const cumAfterW1 = cv > 0 ? round2((w1Amt / cv) * 100) : 0
    const cumAfterW2 = cv > 0 ? round2((prev / cv) * 100) : 0
    const pctW2 = cv > 0 ? round2((w2Amt / cv) * 100) : 0

    rows.push({
      project_id: PROJECT_ID,
      week_number: 1,
      item_name: desc,
      contract_value: cv,
      percentage: pctW1,
      cumulative_percent: cumAfterW1,
      amount: w1Amt,
      locked: false,
      line_order: lineOrder,
      created_at: CREATED_AT.w1,
    })

    rows.push({
      project_id: PROJECT_ID,
      week_number: 2,
      item_name: desc,
      contract_value: cv,
      percentage: pctW2,
      cumulative_percent: cumAfterW2,
      amount: w2Amt,
      locked: false,
      line_order: lineOrder,
      created_at: CREATED_AT.w2,
    })

    rows.push({
      project_id: PROJECT_ID,
      week_number: 3,
      item_name: desc,
      contract_value: cv,
      percentage: pctWeek,
      cumulative_percent: cumPct,
      amount: amtDue,
      locked: false,
      line_order: lineOrder,
      created_at: CREATED_AT.w3,
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
  const portalLines = parseValuationTbody(html)
  const rows = buildRows(portalLines)

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

  console.log(
    `Inserted ${rows.length} valuation rows (${portalLines.length} lines × 3 weeks) for project ${PROJECT_ID}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
