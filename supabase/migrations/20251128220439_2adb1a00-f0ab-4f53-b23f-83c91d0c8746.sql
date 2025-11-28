-- Add icon and animation type fields to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS splash_icon TEXT DEFAULT 'Waves',
ADD COLUMN IF NOT EXISTS splash_animation_type TEXT DEFAULT 'scale';