-- Create storage bucket for PWA icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pwa-icons', 'pwa-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for PWA icons - anyone can view
CREATE POLICY "PWA icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pwa-icons');

-- Create storage policy for PWA icons - authenticated users can upload
CREATE POLICY "Authenticated users can upload PWA icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pwa-icons' AND auth.role() = 'authenticated');

-- Create storage policy for PWA icons - authenticated users can update
CREATE POLICY "Authenticated users can update PWA icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pwa-icons' AND auth.role() = 'authenticated');

-- Create storage policy for PWA icons - authenticated users can delete
CREATE POLICY "Authenticated users can delete PWA icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'pwa-icons' AND auth.role() = 'authenticated');