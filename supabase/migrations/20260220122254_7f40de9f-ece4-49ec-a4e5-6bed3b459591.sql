
-- Create admin login history table
CREATE TABLE public.admin_login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_role text,
  ip_address text,
  user_agent text,
  browser text,
  os text,
  device_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;

-- Only gestores can view login history
CREATE POLICY "Gestores can view login history"
  ON public.admin_login_history FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role));

-- Authenticated users can insert their own login
CREATE POLICY "Authenticated users can insert login history"
  ON public.admin_login_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gestores can delete login history
CREATE POLICY "Gestores can delete login history"
  ON public.admin_login_history FOR DELETE
  USING (has_role(auth.uid(), 'gestor'::app_role));
