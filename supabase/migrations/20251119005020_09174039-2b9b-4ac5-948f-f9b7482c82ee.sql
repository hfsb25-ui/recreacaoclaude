-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can manage announcements"
ON public.announcements
FOR ALL
USING (auth.role() = 'authenticated');

-- Storage policies for announcement images
CREATE POLICY "Anyone can view announcement images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Authenticated users can upload announcement images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'announcements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update announcement images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'announcements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete announcement images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'announcements' AND auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();