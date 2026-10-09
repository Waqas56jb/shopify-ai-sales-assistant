-- Link leads to chat sessions so later name/email updates the same row

ALTER TABLE public.shopify_store_database_leads
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_leads_session
  ON public.shopify_store_database_leads (session_id);
