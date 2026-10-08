/**
 * Wipe mock knowledge and seed real Desk & Day catalog + policies + images.
 * Usage: npm run db:seed
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BUCKET = 'shopify_store_database_assets'
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(
  /\/$/,
  ''
)

const IMAGE_FILES = [
  {
    local: 'aluminum-laptop-stand.png',
    storagePath: 'products/aluminum-laptop-stand.png',
    contentType: 'image/png',
  },
  {
    local: 'compact-wireless-keyboard.png',
    storagePath: 'products/compact-wireless-keyboard.png',
    contentType: 'image/png',
  },
  {
    local: 'rechargeable-led-desk-lamp.png',
    storagePath: 'products/rechargeable-led-desk-lamp.png',
    contentType: 'image/png',
  },
]

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const host = process.env.SUPABASE_DB_HOST
  const port = process.env.SUPABASE_DB_PORT || '6543'
  const database = process.env.SUPABASE_DB_NAME || 'postgres'
  const user = process.env.SUPABASE_DB_USER
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!host || !user || !password) throw new Error('Missing DATABASE_URL or SUPABASE_DB_* env vars')
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

async function uploadImages() {
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const productsDir = path.resolve(__dirname, '../public/products')
  const urls = {}

  for (const img of IMAGE_FILES) {
    urls[img.local] = `${PUBLIC_BASE}/products/${img.local}`
  }

  if (!url || !key) {
    console.warn('Supabase storage skipped (missing URL/key). Using local API image URLs.')
    return urls
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: buckets } = await sb.storage.listBuckets()
  const exists = (buckets || []).some((b) => b.name === BUCKET)
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error && !/already exists/i.test(error.message)) {
      console.warn('Bucket create warning:', error.message)
    } else {
      console.log('Created storage bucket:', BUCKET)
    }
  }

  for (const img of IMAGE_FILES) {
    const filePath = path.join(productsDir, img.local)
    if (!fs.existsSync(filePath)) {
      console.warn('Missing image file:', filePath)
      continue
    }
    const body = fs.readFileSync(filePath)
    const { error } = await sb.storage.from(BUCKET).upload(img.storagePath, body, {
      contentType: img.contentType,
      upsert: true,
    })
    if (error) {
      console.warn(`Upload failed for ${img.local}:`, error.message)
      continue
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(img.storagePath)
    if (data?.publicUrl) {
      urls[img.local] = data.publicUrl
      console.log('Uploaded:', img.local, '→', data.publicUrl)
    }
  }

  return urls
}

function knowledgeRows(imageUrls) {
  return [
    {
      title: 'Adjustable Aluminum Laptop Stand',
      type: 'product',
      price: '39',
      description:
        'Adjustable Aluminum Laptop Stand: $39 USD. For 11 to 17 inch laptops; adjustable height and angle, non-slip pads and fold-flat aluminum construction. Laptop not included.',
      image_url: imageUrls['aluminum-laptop-stand.png'],
      sort_order: 1,
      trained: true,
    },
    {
      title: 'Compact Wireless Keyboard',
      type: 'product',
      price: '59',
      description:
        'Compact Wireless Keyboard: $59 USD. Bluetooth, rechargeable battery, quiet compact keys, no number pad. Sample compatibility: Windows, macOS, iPadOS and Android.',
      image_url: imageUrls['compact-wireless-keyboard.png'],
      sort_order: 2,
      trained: true,
    },
    {
      title: 'Rechargeable LED Desk Lamp',
      type: 'product',
      price: '49',
      description:
        'Rechargeable LED Desk Lamp: $49 USD. Adjustable brightness, warm and cool modes, USB-C charging, adjustable arm. Sample runtime: up to 8 hours on the lowest setting.',
      image_url: imageUrls['rechargeable-led-desk-lamp.png'],
      sort_order: 3,
      trained: true,
    },
    {
      title: 'Demo store overview',
      type: 'faq',
      price: '',
      description:
        'Private demonstration store. Desk & Day is a fictional desk-accessories shop created for an AI shopping assistant tutorial. Products, inventory counts, images and sample policies are for testing only. No real purchases, shipments, refunds or support commitments are offered. Tagline: Small essentials. A more considered desk.',
      image_url: '',
      sort_order: 10,
      trained: true,
    },
    {
      title: 'Which product should I choose?',
      type: 'faq',
      price: '',
      description:
        'For a raised laptop setup, choose the stand and keyboard. For reading or evening work, choose the lamp. The stand plus lamp totals $88; the stand plus keyboard totals $98; all three total $147 before any hypothetical shipping or tax.',
      image_url: '',
      sort_order: 11,
      trained: true,
    },
    {
      title: 'Sample shipping policy',
      type: 'policy',
      price: '',
      description:
        'For chatbot demonstrations, assume shipping within the contiguous United States only. Sample processing time is 1 to 2 business days, followed by 3 to 5 business days in transit. Sample shipping costs $4.95, or is free on merchandise subtotals of $75 or more. These are fictional test rules, not actual services.',
      image_url: '',
      sort_order: 12,
      trained: true,
    },
    {
      title: 'Sample returns policy',
      type: 'policy',
      price: '',
      description:
        'For testing, assume unused items in original packaging may be returned within 30 days of delivery after contacting support. Damaged items should be reported with a photo. No actual returns or refunds are processed by this demo store.',
      image_url: '',
      sort_order: 13,
      trained: true,
    },
    {
      title: 'Can I place an order?',
      type: 'faq',
      price: '',
      description:
        'No. Browse the products and use fictional questions to test the assistant. Do not enter payment information or personal customer data, and do not complete checkout.',
      image_url: '',
      sort_order: 14,
      trained: true,
    },
    {
      title: 'Order tracking and support',
      type: 'faq',
      price: '',
      description:
        'There are no real orders to track. The assistant must not invent order status, tracking numbers or refund confirmations. If a request needs account access or a human decision, explain that it is outside the demo and refer it to the tutorial operator. Do not collect passwords or payment details.',
      image_url: '',
      sort_order: 15,
      trained: true,
    },
    {
      title: 'Contact',
      type: 'other',
      price: '',
      description:
        'Need help choosing a desk essential? Explore the FAQ and Store Guide for product comparisons and sample shipping and returns answers. Desk & Day is a private demonstration storefront for an AI shopping assistant tutorial. There is no customer service team or real fulfillment. Please do not submit real orders, passwords, payment details or personal customer information.',
      image_url: '',
      sort_order: 16,
      trained: true,
    },
  ]
}

async function main() {
  const productsDir = path.resolve(__dirname, '../public/products')
  for (const img of IMAGE_FILES) {
    if (!fs.existsSync(path.join(productsDir, img.local))) {
      throw new Error(`Missing ${img.local} in server/public/products — copy images first`)
    }
  }

  console.log('Uploading product images...')
  const imageUrls = await uploadImages()

  const client = new pg.Client({
    connectionString: buildConnectionString(),
    ssl: { rejectUnauthorized: false },
  })

  console.log('Connecting to Supabase Postgres...')
  await client.connect()

  console.log('Clearing mock rows from prefixed tables...')
  await client.query('DELETE FROM shopify_store_database_training_jobs')
  await client.query('DELETE FROM shopify_store_database_conversations')
  await client.query('DELETE FROM shopify_store_database_leads')
  await client.query('DELETE FROM shopify_store_database_knowledge')

  const rows = knowledgeRows(imageUrls)
  for (const row of rows) {
    await client.query(
      `INSERT INTO shopify_store_database_knowledge
        (title, type, price, description, image_url, sort_order, trained)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.title, row.type, row.price, row.description, row.image_url, row.sort_order, row.trained]
    )
  }
  console.log(`Inserted ${rows.length} knowledge rows`)

  await client.query(
    `INSERT INTO shopify_store_database_training_jobs
      (source_type, label, status, notes)
     VALUES
      ('mixed', 'Desk & Day FAQ & Store Guide', 'completed', 'Seeded products, policies, FAQ, contact + product images'),
      ('image', 'Product photos sync', 'completed', '3 product images stored (Supabase storage or API /products)')`
  )

  await client.query(
    `INSERT INTO shopify_store_database_widget_settings (id)
     VALUES ('default')
     ON CONFLICT (id) DO NOTHING`
  )

  const counts = await client.query(`
    SELECT 'knowledge' AS name, COUNT(*)::int AS count FROM shopify_store_database_knowledge
    UNION ALL SELECT 'training_jobs', COUNT(*)::int FROM shopify_store_database_training_jobs
    UNION ALL SELECT 'leads', COUNT(*)::int FROM shopify_store_database_leads
    UNION ALL SELECT 'conversations', COUNT(*)::int FROM shopify_store_database_conversations;
  `)
  console.log('Row counts:', counts.rows)

  const products = await client.query(
    `SELECT title, price, image_url FROM shopify_store_database_knowledge
     WHERE type = 'product' ORDER BY sort_order`
  )
  console.log('Products:')
  products.rows.forEach((r) => console.log(' -', r.title, `$${r.price}`, r.image_url))

  await client.end()
  console.log('Seed complete.')
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
