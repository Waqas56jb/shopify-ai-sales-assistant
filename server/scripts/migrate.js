import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const host = process.env.SUPABASE_DB_HOST
  const port = process.env.SUPABASE_DB_PORT || '6543'
  const database = process.env.SUPABASE_DB_NAME || 'postgres'
  const user = process.env.SUPABASE_DB_USER
  const password = process.env.SUPABASE_DB_PASSWORD

  if (!host || !user || !password) {
    throw new Error('Missing DATABASE_URL or SUPABASE_DB_* env vars')
  }

  const encodedPass = encodeURIComponent(password)
  return `postgresql://${user}:${encodedPass}@${host}:${port}/${database}`
}

async function main() {
  const connectionString = buildConnectionString()
  const sqlPath = path.join(__dirname, '../sql/001_shopify_store_database_schema.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  console.log('Connecting to Supabase Postgres...')
  await client.connect()

  // Safety: list existing tables that already use our prefix
  const existing = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'shopify_store_database_%'
    ORDER BY table_name;
  `)
  console.log('Existing prefixed tables:', existing.rows.map((r) => r.table_name))

  console.log('Running migration (CREATE IF NOT EXISTS only)...')
  await client.query(sql)

  const after = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'shopify_store_database_%'
    ORDER BY table_name;
  `)
  console.log('Prefixed tables after migration:')
  after.rows.forEach((r) => console.log(' -', r.table_name))

  const counts = await client.query(`
    SELECT 'leads' AS name, COUNT(*)::int AS count FROM shopify_store_database_leads
    UNION ALL
    SELECT 'conversations', COUNT(*)::int FROM shopify_store_database_conversations
    UNION ALL
    SELECT 'knowledge', COUNT(*)::int FROM shopify_store_database_knowledge
    UNION ALL
    SELECT 'training_jobs', COUNT(*)::int FROM shopify_store_database_training_jobs
    UNION ALL
    SELECT 'widget_settings', COUNT(*)::int FROM shopify_store_database_widget_settings;
  `)
  console.log('Row counts:', counts.rows)

  await client.end()
  console.log('Migration complete. No other project tables were modified.')
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
