-- Create table for tracking site visits
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_site_visits_created_at ON public.site_visits(created_at);
CREATE INDEX idx_site_visits_session_id ON public.site_visits(session_id);
CREATE INDEX idx_site_visits_page_path ON public.site_visits(page_path);

-- Enable Row Level Security
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert visits (for anonymous tracking)
CREATE POLICY "Anyone can insert visits" 
ON public.site_visits 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to view visits (for admin stats)
CREATE POLICY "Authenticated users can view visits" 
ON public.site_visits 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete visits (for cleanup)
CREATE POLICY "Authenticated users can delete visits" 
ON public.site_visits 
FOR DELETE 
USING (auth.role() = 'authenticated');