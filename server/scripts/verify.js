import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

async function main() {
  const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)
  const connectionString = `postgresql://${process.env.SUPABASE_DB_USER}:${password}@${process.env.SUPABASE_DB_HOST}:${process.env.SUPABASE_DB_PORT}/${process.env.SUPABASE_DB_NAME}`
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const ours = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'shopify_store_database_%'
    ORDER BY table_name;
  `)

  const others = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND table_type='BASE TABLE'
      AND table_name NOT LIKE 'shopify_store_database_%'
    ORDER BY table_name
    LIMIT 50;
  `)

  console.log('OUR TABLES (' + ours.rows.length + '):')
  ours.rows.forEach((r) => console.log(' ✓', r.table_name))
  console.log('\nOTHER PUBLIC TABLES (untouched, showing up to 50):')
  others.rows.forEach((r) => console.log(' ·', r.table_name))

  await client.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
