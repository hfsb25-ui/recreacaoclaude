-- Add resolution column to totem_config
ALTER TABLE public.totem_config 
ADD COLUMN resolution TEXT DEFAULT '1920x1080';