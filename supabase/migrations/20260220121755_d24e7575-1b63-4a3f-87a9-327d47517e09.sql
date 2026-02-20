
-- Create leads table to preserve guest contact info after deletion
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  room_number text NOT NULL,
  phone text,
  total_points integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  source_guest_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  imported_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (gestores/recreadores) can view/manage leads
CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete leads"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated');
