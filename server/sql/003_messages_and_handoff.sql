-- Chat messages + conversation session / handoff fields

ALTER TABLE public.shopify_store_database_conversations
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lead_id uuid NULL,
  ADD COLUMN IF NOT EXISTS handoff_note text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_conversations_session
  ON public.shopify_store_database_conversations (session_id);

CREATE TABLE IF NOT EXISTS public.shopify_store_database_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NULL REFERENCES public.shopify_store_database_conversations (id) ON DELETE CASCADE,
  session_id text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_messages_session
  ON public.shopify_store_database_messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_shopify_store_database_messages_conversation
  ON public.shopify_store_database_messages (conversation_id, created_at ASC);
