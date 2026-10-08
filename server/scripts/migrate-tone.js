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
  const sql = fs.readFileSync(path.join(__dirname, '../sql/002_assistant_tone.sql'), 'utf8')
  const client = new pg.Client({
    connectionString: buildConnectionString(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(sql)
  const row = await client.query(
    `SELECT id, assistant_tone FROM shopify_store_database_widget_settings WHERE id = 'default'`
  )
  console.log('Tone column ready:', row.rows[0])
  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
