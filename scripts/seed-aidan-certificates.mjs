/**
 * Seed Aidan certificates for payment tracker.
 *
 * Requires certificates table to exist (see migration 20260406160000_create_certificates.sql).
 * Run: node --env-file=.env.local scripts/seed-aidan-certificates.mjs
 */

import { createClient } from '@supabase/supabase-js'

const PROJECT_ID = '5bb2db90-a0c6-4fe5-8627-04662bc29434'

const CERTIFICATES = [
  {
    certificate_number: 'Deposit',
    amount: 22614,
    date_issued: '2026-03-09',
    due_date: '2026-03-09',
    date_paid: '2026-03-09',
    status: 'paid',
  },
  {
    certificate_number: 'Certificate #001',
    amount: 25569,
    date_issued: '2026-03-15',
    due_date: '2026-03-22',
    date_paid: '2026-03-21',
    status: 'paid',
  },
  {
    certificate_number: 'Certificate #002',
    amount: 10631,
    date_issued: '2026-03-22',
    due_date: '2026-03-29',
    date_paid: '2026-03-28',
    status: 'paid',
  },
  {
    certificate_number: 'Certificate #003',
    amount: 9005,
    date_issued: '2026-03-28',
    due_date: '2026-04-04',
    date_paid: '2026-04-01',
    status: 'paid',
  },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { error: checkErr } = await supabase.from('certificates').select('id').limit(1)
  if (checkErr) {
    console.error(
      `certificates table is unavailable (${checkErr.message}). Apply Supabase migrations first.`,
    )
    process.exit(1)
  }

  const { error: delErr } = await supabase
    .from('certificates')
    .delete()
    .eq('project_id', PROJECT_ID)
  if (delErr) {
    console.error('Delete existing certificates failed:', delErr.message)
    process.exit(1)
  }

  const rows = CERTIFICATES.map((c) => ({ project_id: PROJECT_ID, ...c }))
  const { data, error } = await supabase.from('certificates').insert(rows).select('id')
  if (error) {
    console.error('Insert certificates failed:', error.message)
    process.exit(1)
  }

  console.log(`Inserted ${data?.length ?? rows.length} certificates for project ${PROJECT_ID}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
