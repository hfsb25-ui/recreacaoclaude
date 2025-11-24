-- Create activity ratings table
CREATE TABLE public.activity_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
ON public.activity_ratings
FOR SELECT
USING (true);

-- Anyone can insert ratings (guest feedback)
CREATE POLICY "Anyone can insert ratings"
ON public.activity_ratings
FOR INSERT
WITH CHECK (true);

-- Authenticated users can delete ratings (admin cleanup)
CREATE POLICY "Authenticated users can delete ratings"
ON public.activity_ratings
FOR DELETE
USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_activity_ratings_activity_id ON public.activity_ratings(activity_id);
CREATE INDEX idx_activity_ratings_created_at ON public.activity_ratings(created_at DESC);