
-- Add phone column to guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS phone text;

-- Create whatsapp_config table
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_url text NOT NULL,
  api_key text NOT NULL,
  instance_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view whatsapp config" ON public.whatsapp_config
  FOR SELECT USING (true);

CREATE POLICY "Gestores can manage whatsapp config" ON public.whatsapp_config
  FOR ALL USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create whatsapp_reminders table
CREATE TABLE public.whatsapp_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guest_id, activity_id)
);

ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reminders" ON public.whatsapp_reminders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view reminders" ON public.whatsapp_reminders
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update reminders" ON public.whatsapp_reminders
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete reminders" ON public.whatsapp_reminders
  FOR DELETE USING (auth.role() = 'authenticated'::text);
