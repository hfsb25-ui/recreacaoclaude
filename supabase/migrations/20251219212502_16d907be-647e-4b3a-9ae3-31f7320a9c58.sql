-- Add is_active column to age_groups table
ALTER TABLE public.age_groups ADD COLUMN is_active boolean NOT NULL DEFAULT true;