-- Create totem_config table for lobby TV settings
CREATE TABLE public.totem_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT true,
  slides_config JSONB NOT NULL DEFAULT '[
    {"type": "schedule", "order": 1, "duration": 15, "active": true},
    {"type": "ranking", "order": 2, "duration": 10, "active": true},
    {"type": "announcements", "order": 3, "duration": 12, "active": true},
    {"type": "weather", "order": 4, "duration": 8, "active": true},
    {"type": "qrcode", "order": 5, "duration": 10, "active": true}
  ]'::jsonb,
  theme TEXT NOT NULL DEFAULT 'dark',
  qr_code_url TEXT,
  refresh_interval INTEGER NOT NULL DEFAULT 5,
  access_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.totem_config ENABLE ROW LEVEL SECURITY;

-- Allow public read for totem display
CREATE POLICY "Anyone can read totem config" 
ON public.totem_config 
FOR SELECT 
USING (true);

-- Only gestor can update totem config
CREATE POLICY "Gestores can manage totem config" 
ON public.totem_config 
FOR ALL 
USING (public.has_role(auth.uid(), 'gestor'));

-- Insert default config
INSERT INTO public.totem_config (id) VALUES (gen_random_uuid());

-- Add trigger for updated_at
CREATE TRIGGER update_totem_config_updated_at
BEFORE UPDATE ON public.totem_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();