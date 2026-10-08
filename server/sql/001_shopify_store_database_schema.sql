-- Desk & Day / shopify-ai-sales-assistant
-- Prefixed tables to avoid overlap with other projects on the same Supabase instance.
-- Prefix: shopify_store_database_

CREATE TABLE IF NOT EXISTS public.shopify_store_database_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_store_database_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor text NOT NULL DEFAULT 'Guest',
  channel text NOT NULL DEFAULT 'widget',
  status text NOT NULL DEFAULT 'open',
  last_message text NOT NULL DEFAULT '',
  messages_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_store_database_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'product',
  price text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 1,
  trained boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_store_database_training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'text',
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_store_database_widget_settings (
  id text PRIMARY KEY DEFAULT 'default',
  primary_color text NOT NULL DEFAULT '#1a1714',
  accent_color text NOT NULL DEFAULT '#a67c52',
  bubble_color text NOT NULL DEFAULT '#f4efe6',
  text_color text NOT NULL DEFAULT '#1a1714',
  launcher_color text NOT NULL DEFAULT '#a67c52',
  assistant_tone text NOT NULL DEFAULT 'professional',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_leads_created
  ON public.shopify_store_database_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_conversations_updated
  ON public.shopify_store_database_conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_knowledge_order
  ON public.shopify_store_database_knowledge (sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_training_created
  ON public.shopify_store_database_training_jobs (created_at DESC);

-- Seed widget settings (safe upsert)
INSERT INTO public.shopify_store_database_widget_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Seed knowledge only if empty (full catalog via: npm run db:seed)
INSERT INTO public.shopify_store_database_knowledge (title, type, price, description, image_url, sort_order, trained)
SELECT * FROM (VALUES
  ('Adjustable Aluminum Laptop Stand', 'product', '39',
   'Adjustable Aluminum Laptop Stand: $39 USD. For 11 to 17 inch laptops; adjustable height and angle, non-slip pads and fold-flat aluminum construction. Laptop not included.',
   '/products/aluminum-laptop-stand.png', 1, true),
  ('Compact Wireless Keyboard', 'product', '59',
   'Compact Wireless Keyboard: $59 USD. Bluetooth, rechargeable battery, quiet compact keys, no number pad. Sample compatibility: Windows, macOS, iPadOS and Android.',
   '/products/compact-wireless-keyboard.png', 2, true),
  ('Rechargeable LED Desk Lamp', 'product', '49',
   'Rechargeable LED Desk Lamp: $49 USD. Adjustable brightness, warm and cool modes, USB-C charging, adjustable arm. Sample runtime: up to 8 hours on the lowest setting.',
   '/products/rechargeable-led-desk-lamp.png', 3, true),
  ('Sample shipping policy', 'policy', '',
   'Contiguous US only. Processing 1–2 business days; transit 3–5 business days. $4.95 or free on subtotals of $75+. Fictional demo rules.',
   '', 12, true)
) AS v(title, type, price, description, image_url, sort_order, trained)
WHERE NOT EXISTS (SELECT 1 FROM public.shopify_store_database_knowledge LIMIT 1);
