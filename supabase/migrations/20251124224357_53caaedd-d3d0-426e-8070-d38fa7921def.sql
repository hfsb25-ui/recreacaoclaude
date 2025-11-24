-- Create activity_templates table for activity catalog
CREATE TABLE public.activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view activity templates
CREATE POLICY "Anyone can view activity templates" 
ON public.activity_templates
FOR SELECT 
USING (true);

-- Authenticated users can insert activity templates
CREATE POLICY "Authenticated users can insert activity templates" 
ON public.activity_templates
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update activity templates
CREATE POLICY "Authenticated users can update activity templates" 
ON public.activity_templates
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Authenticated users can delete activity templates
CREATE POLICY "Authenticated users can delete activity templates" 
ON public.activity_templates
FOR DELETE 
USING (auth.role() = 'authenticated');