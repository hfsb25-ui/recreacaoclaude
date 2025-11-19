-- Add site_name field to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN site_name TEXT DEFAULT 'Recreação Hotel';