-- Add footer_text column to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN footer_text TEXT DEFAULT 'Recreação Hotel © 2024. Todos os direitos reservados.';