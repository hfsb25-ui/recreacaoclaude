-- Create storage bucket for logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create site_settings table to store logo configuration
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view site settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only gestores can update site settings
CREATE POLICY "Gestores can update site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- Insert initial empty settings
INSERT INTO public.site_settings (id, logo_url) 
VALUES ('00000000-0000-0000-0000-000000000001', null);

-- Storage policies for logos bucket
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Gestores can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Gestores can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND
  public.has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Gestores can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  public.has_role(auth.uid(), 'gestor')
);