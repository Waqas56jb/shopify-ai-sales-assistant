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
  const sql = fs.readFileSync(path.join(__dirname, '../sql/003_messages_and_handoff.sql'), 'utf8')
  const client = new pg.Client({
    connectionString: buildConnectionString(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(sql)
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'shopify_store_database_%'
    ORDER BY table_name
  `)
  console.log('Tables:', tables.rows.map((r) => r.table_name))
  await client.end()
  console.log('Messages + handoff migration complete')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
