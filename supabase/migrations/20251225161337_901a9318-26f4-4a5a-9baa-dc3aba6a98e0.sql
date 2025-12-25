-- Add PWA icon URL column to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS pwa_icon_url text;