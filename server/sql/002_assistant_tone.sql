-- Add assistant tone to widget settings (safe for existing rows)
ALTER TABLE public.shopify_store_database_widget_settings
  ADD COLUMN IF NOT EXISTS assistant_tone text NOT NULL DEFAULT 'professional';

UPDATE public.shopify_store_database_widget_settings
SET assistant_tone = 'professional'
WHERE assistant_tone IS NULL OR assistant_tone = '';
