CREATE TABLE public.totem_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  alert_type text NOT NULL DEFAULT 'info' CHECK (alert_type IN ('info', 'warning', 'success', 'danger')),
  duration_seconds integer NOT NULL DEFAULT 10 CHECK (duration_seconds > 0 AND duration_seconds <= 300),
  play_sound boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.totem_alerts TO authenticated;
GRANT ALL ON public.totem_alerts TO service_role;
GRANT SELECT ON public.totem_alerts TO anon;

ALTER TABLE public.totem_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage totem alerts"
  ON public.totem_alerts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Totem can read active alerts"
  ON public.totem_alerts
  FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_totem_alerts_updated_at
  BEFORE UPDATE ON public.totem_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.totem_alerts;