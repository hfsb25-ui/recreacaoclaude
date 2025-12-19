-- Add is_master column to activities table
ALTER TABLE public.activities ADD COLUMN is_master boolean NOT NULL DEFAULT false;