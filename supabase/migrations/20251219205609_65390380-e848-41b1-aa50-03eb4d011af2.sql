-- Add pdf_settings column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN pdf_settings JSONB DEFAULT NULL;