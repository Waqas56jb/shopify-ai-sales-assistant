import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const host = process.env.SUPABASE_DB_HOST
  const port = process.env.SUPABASE_DB_PORT || '6543'
  const database = process.env.SUPABASE_DB_NAME || 'postgres'
  const user = process.env.SUPABASE_DB_USER
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!host || !user || !password) throw new Error('Missing DB env')
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/004_leads_session.sql'), 'utf8')
  const client = new pg.Client({
    connectionString: buildConnectionString(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(sql)
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='shopify_store_database_leads'
    ORDER BY ordinal_position
  `)
  console.log(
    'Lead columns:',
    cols.rows.map((r) => r.column_name)
  )
  await client.end()
  console.log('Leads session_id migration complete')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
