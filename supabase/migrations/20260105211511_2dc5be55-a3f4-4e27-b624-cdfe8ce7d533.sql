-- Create junction table for age groups and recreadores (staff)
CREATE TABLE public.age_group_recreadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age_group_id uuid NOT NULL REFERENCES public.age_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recreador_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(age_group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.age_group_recreadores ENABLE ROW LEVEL SECURITY;

-- Anyone can view (needed for PDF generation)
CREATE POLICY "Anyone can view age group recreadores"
ON public.age_group_recreadores
FOR SELECT
USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can manage age group recreadores"
ON public.age_group_recreadores
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');