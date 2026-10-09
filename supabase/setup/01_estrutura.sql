-- ESTRUTURA COMPLETA DO BANCO (35 migrations, na ordem original)
-- Cole tudo no SQL Editor do projeto Supabase NOVO e clique em Run.
-- Rode ANTES de importar os dados.

-- ===== 20251118010319_128d1829-fbfc-4599-b983-1bb72ab9916c.sql =====
-- Create age_groups table
CREATE TABLE public.age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00BCD4',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for age_groups
ALTER TABLE public.age_groups ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read age groups
CREATE POLICY "Anyone can view age groups"
  ON public.age_groups
  FOR SELECT
  USING (true);

-- Only authenticated users can manage age groups
CREATE POLICY "Authenticated users can insert age groups"
  ON public.age_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update age groups"
  ON public.age_groups
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete age groups"
  ON public.age_groups
  FOR DELETE
  TO authenticated
  USING (true);

-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES public.age_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read activities
CREATE POLICY "Anyone can view activities"
  ON public.activities
  FOR SELECT
  USING (true);

-- Only authenticated users can manage activities
CREATE POLICY "Authenticated users can insert activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete activities"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_activities_date ON public.activities(activity_date);
CREATE INDEX idx_activities_age_group ON public.activities(age_group_id);

-- ===== 20251119005020_09174039-2b9b-4ac5-948f-f9b7482c82ee.sql =====
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

-- ===== 20251119012911_f86af2d4-03d4-4ff2-9d9a-1384e138e1bd.sql =====
-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 20251119025237_3c00b1af-eace-4322-91dd-72524cad8499.sql =====
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('gestor', 'recreador');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Gestores can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ===== 20251119032201_9b9b6573-13fa-4bbc-8629-251de94f18b0.sql =====
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

-- ===== 20251119032923_d1b6c71d-87b3-42f1-841b-5aedf1bb71dc.sql =====
-- Add footer_text column to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN footer_text TEXT DEFAULT 'Recreação Hotel © 2024. Todos os direitos reservados.';

-- ===== 20251119035746_0ceb408d-4ef5-4128-a6b5-81c8d1e69f1a.sql =====
-- Add site_name field to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN site_name TEXT DEFAULT 'Recreação Hotel';

-- ===== 20251124212415_3e8377f3-1422-4237-895a-6363521aaf90.sql =====
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

-- ===== 20251124214057_034b0fb0-0c90-4703-9b38-3bb2e52bdcbe.sql =====
-- Add room_number column to activity_ratings table
ALTER TABLE public.activity_ratings 
ADD COLUMN room_number text;

-- ===== 20251124224357_53caaedd-d3d0-426e-8070-d38fa7921def.sql =====
-- Create activity_templates table for activity catalog
CREATE TABLE public.activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view activity templates
CREATE POLICY "Anyone can view activity templates" 
ON public.activity_templates
FOR SELECT 
USING (true);

-- Authenticated users can insert activity templates
CREATE POLICY "Authenticated users can insert activity templates" 
ON public.activity_templates
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update activity templates
CREATE POLICY "Authenticated users can update activity templates" 
ON public.activity_templates
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Authenticated users can delete activity templates
CREATE POLICY "Authenticated users can delete activity templates" 
ON public.activity_templates
FOR DELETE 
USING (auth.role() = 'authenticated');

-- ===== 20251124230547_2437908c-8107-4e79-9755-1a6ca91590c5.sql =====
-- Add weather location fields to site_settings table
ALTER TABLE site_settings 
ADD COLUMN weather_latitude DECIMAL(10, 8),
ADD COLUMN weather_longitude DECIMAL(11, 8),
ADD COLUMN weather_city_name TEXT;

COMMENT ON COLUMN site_settings.weather_latitude IS 'Latitude for weather location';
COMMENT ON COLUMN site_settings.weather_longitude IS 'Longitude for weather location';
COMMENT ON COLUMN site_settings.weather_city_name IS 'City name for weather display';

-- ===== 20251124232246_8bdcd3f4-209c-4fc1-acef-0d404ad7c1c4.sql =====
-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_number, pin_code)
);

-- Create activity_checkins table
CREATE TABLE public.activity_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  points_earned INTEGER DEFAULT 10,
  UNIQUE(guest_id, activity_id)
);

-- Create ranking_periods table
CREATE TABLE public.ranking_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ranking_winners table
CREATE TABLE public.ranking_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_period_id UUID REFERENCES public.ranking_periods(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  final_position INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  total_checkins INTEGER NOT NULL,
  prize_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create levels table
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  badge_emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reset_config table
CREATE TABLE public.reset_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_day_1 INTEGER NOT NULL,
  reset_day_2 INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reset_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guests
CREATE POLICY "Anyone can register as guest" ON public.guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view guests" ON public.guests
  FOR SELECT USING (true);

CREATE POLICY "Guests can update own profile" ON public.guests
  FOR UPDATE USING (true);

CREATE POLICY "Admins can manage guests" ON public.guests
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for activity_checkins
CREATE POLICY "Anyone can checkin" ON public.activity_checkins
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view checkins" ON public.activity_checkins
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage checkins" ON public.activity_checkins
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for ranking_periods
CREATE POLICY "Anyone can view ranking periods" ON public.ranking_periods
  FOR SELECT USING (true);

CREATE POLICY "Admins manage ranking periods" ON public.ranking_periods
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for ranking_winners
CREATE POLICY "Anyone can view winners" ON public.ranking_winners
  FOR SELECT USING (true);

CREATE POLICY "Admins manage winners" ON public.ranking_winners
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for levels
CREATE POLICY "Anyone can view levels" ON public.levels
  FOR SELECT USING (true);

CREATE POLICY "Admins manage levels" ON public.levels
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for reset_config
CREATE POLICY "Anyone can view reset config" ON public.reset_config
  FOR SELECT USING (true);

CREATE POLICY "Admins manage reset config" ON public.reset_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to update guest level
CREATE OR REPLACE FUNCTION public.update_guest_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
BEGIN
  SELECT level_number INTO new_level
  FROM public.levels
  WHERE min_points <= NEW.total_points
  ORDER BY min_points DESC
  LIMIT 1;
  
  IF new_level IS NOT NULL THEN
    NEW.current_level = new_level;
  END IF;
  
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update level on points change
CREATE TRIGGER update_level_on_points
  BEFORE UPDATE OF total_points ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_level();

-- Function to add points on checkin
CREATE OR REPLACE FUNCTION public.add_points_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guests
  SET total_points = total_points + NEW.points_earned
  WHERE id = NEW.guest_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to add points
CREATE TRIGGER add_points_trigger
  AFTER INSERT ON public.activity_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.add_points_on_checkin();

-- Insert initial levels data
INSERT INTO public.levels (level_number, name, min_points, badge_emoji) VALUES
  (1, 'Iniciante', 0, '🌱'),
  (2, 'Explorador', 50, '🔍'),
  (3, 'Aventureiro', 150, '🎒'),
  (4, 'Esportista', 300, '⚽'),
  (5, 'Atleta', 500, '🏃'),
  (6, 'Campeão', 750, '🏅'),
  (7, 'Mestre', 1000, '🎯'),
  (8, 'Lenda', 1500, '⭐'),
  (9, 'Super Star', 2000, '🌟'),
  (10, 'VIP Recreation', 3000, '👑');

-- Insert default reset config (Wednesdays=3 and Sundays=0)
INSERT INTO public.reset_config (reset_day_1, reset_day_2) VALUES (3, 0);

-- Create initial ranking period
INSERT INTO public.ranking_periods (period_number, start_date, end_date, is_active) 
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true);

-- ===== 20251124233906_95a331aa-7156-404b-a602-1dc384772db7.sql =====
-- Add reset_time column to reset_config table
ALTER TABLE reset_config 
ADD COLUMN reset_time TIME DEFAULT '00:00:00';

-- ===== 20251125150200_4158692d-3f6d-4a11-bdfd-3c47a826624d.sql =====
-- Create table for push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for push subscriptions
CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  notify_before_activity BOOLEAN DEFAULT true,
  minutes_before INTEGER DEFAULT 15,
  notify_new_activities BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for notification preferences
CREATE POLICY "Guests can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (true);

CREATE POLICY "Guests can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Guests can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 20251128210118_6dd1e78b-a042-46e6-8c0f-25b8f224201d.sql =====
-- Add splash screen configuration fields to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN splash_title TEXT DEFAULT 'Recreação Hotel',
ADD COLUMN splash_subtitle TEXT DEFAULT 'Sua programação de atividades',
ADD COLUMN splash_duration INTEGER DEFAULT 2000,
ADD COLUMN splash_gradient_from TEXT DEFAULT '192 92% 60%',
ADD COLUMN splash_gradient_via TEXT DEFAULT '280 80% 65%',
ADD COLUMN splash_gradient_to TEXT DEFAULT '340 85% 70%';

-- ===== 20251128220439_2adb1a00-f0ab-4f53-b23f-83c91d0c8746.sql =====
-- Add icon and animation type fields to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS splash_icon TEXT DEFAULT 'Waves',
ADD COLUMN IF NOT EXISTS splash_animation_type TEXT DEFAULT 'scale';

-- ===== 20251219205609_65390380-e848-41b1-aa50-03eb4d011af2.sql =====
-- Add pdf_settings column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN pdf_settings JSONB DEFAULT NULL;

-- ===== 20251219211454_efc16393-2930-4568-b8e2-ca3170c3d86a.sql =====
-- Add is_master column to activities table
ALTER TABLE public.activities ADD COLUMN is_master boolean NOT NULL DEFAULT false;

-- ===== 20251219212502_16d907be-647e-4b3a-9ae3-31f7320a9c58.sql =====
-- Add is_active column to age_groups table
ALTER TABLE public.age_groups ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- ===== 20251219214929_987eb31b-58dc-4ddc-bbdc-064a4a415bce.sql =====
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

-- ===== 20251225161337_901a9318-26f4-4a5a-9baa-dc3aba6a98e0.sql =====
-- Add PWA icon URL column to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS pwa_icon_url text;

-- ===== 20251225161403_f0cc945a-5bdf-4bbc-a017-a38147c2664d.sql =====
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

-- ===== 20251227193434_be78414f-6d55-4108-a461-61a79144520c.sql =====
-- Adicionar campos para botão opcional nos anúncios
ALTER TABLE public.announcements 
ADD COLUMN button_text text DEFAULT NULL,
ADD COLUMN button_url text DEFAULT NULL;

-- ===== 20260105211511_2dc5be55-a3f4-4e27-b624-cdfe8ce7d533.sql =====
-- Create junction table for age groups and recreadores (staff)
CREATE TABLE public.age_group_recreadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age_group_id uuid NOT NULL REFERENCES public.age_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recreador_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(age_group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.age_group_recreadores ENABLE ROW LEVEL SECURITY;

-- Anyone can view (needed for PDF generation)
CREATE POLICY "Anyone can view age group recreadores"
ON public.age_group_recreadores
FOR SELECT
USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can manage age group recreadores"
ON public.age_group_recreadores
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ===== 20260116192533_5374cc45-2376-43af-9773-202e4917ece7.sql =====
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

-- ===== 20260117124354_97f34356-1f13-4d43-903d-4bab8fc6de6f.sql =====
-- Add resolution column to totem_config
ALTER TABLE public.totem_config 
ADD COLUMN resolution TEXT DEFAULT '1920x1080';

-- ===== 20260118161533_f53a8dd1-bd3a-45fc-904d-ed0cf48a6dc3.sql =====
-- Add guest_id and points_earned columns to activity_ratings
ALTER TABLE public.activity_ratings 
ADD COLUMN guest_id uuid REFERENCES public.guests(id);

ALTER TABLE public.activity_ratings 
ADD COLUMN points_earned integer DEFAULT 5;

-- Create function to add points on rating
CREATE OR REPLACE FUNCTION public.add_points_on_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.guest_id IS NOT NULL THEN
    UPDATE public.guests 
    SET total_points = total_points + COALESCE(NEW.points_earned, 5)
    WHERE id = NEW.guest_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically add points when rating is inserted
CREATE TRIGGER add_rating_points_trigger
AFTER INSERT ON public.activity_ratings
FOR EACH ROW EXECUTE FUNCTION public.add_points_on_rating();

-- ===== 20260118170354_21e2280d-c6c9-433c-b630-b61fd2c1fbc9.sql =====
-- Add unique constraint: one rating per guest per activity
CREATE UNIQUE INDEX idx_unique_guest_activity_rating 
ON public.activity_ratings (guest_id, activity_id) 
WHERE guest_id IS NOT NULL;

-- ===== 20260119160732_8b0869a2-0bb8-4378-98a5-07a61312505c.sql =====
-- Create an admin-only function to detach ratings from guests (preserve historical ratings)
CREATE OR REPLACE FUNCTION public.admin_detach_activity_ratings_guest_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow authenticated gestores
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT public.has_role(auth.uid(), 'gestor'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.activity_ratings
  SET guest_id = NULL
  WHERE guest_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_detach_activity_ratings_guest_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_detach_activity_ratings_guest_ids() TO authenticated;


-- ===== 20260206175148_bfdc80ef-1cd3-40c9-a98d-8fb34c95f199.sql =====
-- Create guest_spins table (tracks spins earned by guests)
CREATE TABLE public.guest_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('checkin', 'rating', 'daily')),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create spin_results table (tracks results of spins)
CREATE TABLE public.spin_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  spin_id UUID NOT NULL REFERENCES public.guest_spins(id) ON DELETE CASCADE,
  result_type TEXT NOT NULL CHECK (result_type IN ('points', 'minigame', 'nothing')),
  points_won INTEGER DEFAULT 0,
  minigame_type TEXT CHECK (minigame_type IN ('memory', 'quiz', 'words') OR minigame_type IS NULL),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create minigame_results table (tracks mini-game results)
CREATE TABLE public.minigame_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('memory', 'quiz', 'words')),
  score INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_in_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.guest_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_spins
CREATE POLICY "Guests can view their own spins"
  ON public.guest_spins FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert spins"
  ON public.guest_spins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Guests can update their own spins"
  ON public.guest_spins FOR UPDATE
  USING (true);

-- RLS Policies for spin_results
CREATE POLICY "Guests can view their own spin results"
  ON public.spin_results FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert spin results"
  ON public.spin_results FOR INSERT
  WITH CHECK (true);

-- RLS Policies for minigame_results
CREATE POLICY "Guests can view their own minigame results"
  ON public.minigame_results FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert minigame results"
  ON public.minigame_results FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_guest_spins_guest_id ON public.guest_spins(guest_id);
CREATE INDEX idx_guest_spins_used ON public.guest_spins(used);
CREATE INDEX idx_spin_results_guest_id ON public.spin_results(guest_id);
CREATE INDEX idx_minigame_results_guest_id ON public.minigame_results(guest_id);

-- ===== 20260206221829_cc60a13a-8be4-4251-b017-fca796b1031d.sql =====

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active questions (for the game)
CREATE POLICY "Anyone can view active quiz questions"
ON public.quiz_questions
FOR SELECT
USING (is_active = true);

-- Authenticated users (gestores) can manage all questions
CREATE POLICY "Authenticated users can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');


-- ===== 20260212144111_721f3d36-300d-438d-b5f5-f1d46fec3b89.sql =====

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


-- ===== 20260220121755_d24e7575-1b63-4a3f-87a9-327d47517e09.sql =====

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


-- ===== 20260220122254_7f40de9f-ece4-49ec-a4e5-6bed3b459591.sql =====

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


-- ===== 20260906122252_17874c36-d3a1-4e38-b2d3-d629d0ae4793.sql =====
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
-- =====================================================================
-- Alerta de avaliação baixa no WhatsApp do gestor
-- Quando uma avaliação com nota <= limite é registrada, o banco envia
-- uma mensagem pela Evolution API para cada número cadastrado.
-- =====================================================================

create extension if not exists pg_net;

-- 1) Segurança: a configuração do WhatsApp (com a API Key) só pode ser lida por gestores
drop policy if exists "Anyone can view whatsapp config" on public.whatsapp_config;
drop policy if exists "Gestores can view whatsapp config" on public.whatsapp_config;
create policy "Gestores can view whatsapp config" on public.whatsapp_config
  for select using (public.has_role(auth.uid(), 'gestor'::app_role));

-- 2) Configuração do alerta (fica junto da configuração do WhatsApp)
alter table public.whatsapp_config
  add column if not exists rating_alert_enabled boolean not null default true,
  add column if not exists rating_alert_threshold integer not null default 2
    check (rating_alert_threshold between 1 and 4);

-- 3) Números que recebem o alerta
create table if not exists public.rating_alert_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.rating_alert_recipients enable row level security;

drop policy if exists "Gestores manage rating alert recipients" on public.rating_alert_recipients;
create policy "Gestores manage rating alert recipients" on public.rating_alert_recipients
  for all using (public.has_role(auth.uid(), 'gestor'::app_role))
  with check (public.has_role(auth.uid(), 'gestor'::app_role));

-- 4) Registro de quando o alerta foi disparado
alter table public.activity_ratings
  add column if not exists alert_sent_at timestamptz;

-- 5) Função que monta e envia a mensagem
create or replace function public.notify_low_rating()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  act record;
  rcp record;
  msg text;
  digits text;
  sent integer := 0;
  has_cfg boolean := false;
  has_act boolean := false;
begin
  for cfg in
    select * from public.whatsapp_config
    where is_active = true
    order by updated_at desc
    limit 1
  loop
    has_cfg := true;
  end loop;

  if not has_cfg or not cfg.rating_alert_enabled or new.rating > cfg.rating_alert_threshold then
    return new;
  end if;

  for act in
    select a.name, a.activity_date, a.start_time, g.name as age_group
    from public.activities a
    left join public.age_groups g on g.id = a.age_group_id
    where a.id = new.activity_id
  loop
    has_act := true;
  end loop;

  if not has_act then
    return new;
  end if;

  msg := '⚠️ *Avaliação baixa na recreação*' || E'\n\n'
      || '*Atividade:* ' || coalesce(act.name, '—')
      || coalesce(' (' || act.age_group || ')', '') || E'\n'
      || '*Quando:* ' || coalesce(to_char(act.activity_date, 'DD/MM'), '—')
      || coalesce(' às ' || to_char(act.start_time, 'HH24:MI'), '') || E'\n'
      || '*Nota:* ' || repeat('⭐', new.rating) || ' (' || new.rating || ' de 5)' || E'\n'
      || '*Hóspede:* ' || coalesce(new.guest_name, '—')
      || coalesce(', apto ' || nullif(new.room_number, ''), '') || E'\n'
      || '*Comentário:* ' || coalesce(nullif(trim(new.comment), ''), '(sem comentário)') || E'\n\n'
      || 'Procure o hóspede antes do check-out 🙏';

  for rcp in
    select * from public.rating_alert_recipients where is_active = true
  loop
    digits := regexp_replace(rcp.phone, '\D', '', 'g');
    if length(digits) in (10, 11) then
      digits := '55' || digits;
    end if;
    continue when length(digits) < 12;

    perform net.http_post(
      url := rtrim(cfg.instance_url, '/') || '/message/sendText/' || cfg.instance_name,
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', cfg.api_key),
      body := jsonb_build_object('number', digits, 'text', msg)
    );
    sent := sent + 1;
  end loop;

  if sent > 0 then
    update public.activity_ratings set alert_sent_at = now() where id = new.id;
  end if;

  return new;
exception when others then
  -- O alerta nunca pode impedir o hóspede de avaliar
  raise warning 'notify_low_rating falhou: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_low_rating() from public, anon, authenticated;

drop trigger if exists trg_notify_low_rating on public.activity_ratings;
create trigger trg_notify_low_rating
  after insert on public.activity_ratings
  for each row execute function public.notify_low_rating();
-- =====================================================================
-- Hóspedes sincronizados do TOTVS PMS
-- Recebe só o mínimo: apto, titular, adultos, crianças, entrada, saída e status.
-- Os dados são apagados automaticamente 1 dia após a saída (LGPD).
-- =====================================================================

create table if not exists public.pms_stays (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null,
  uh text not null,
  guest_name text not null,
  surname text not null,
  adults integer not null default 0,
  children integer not null default 0,
  guests_listed integer not null default 0,
  arrival_date timestamptz,
  departure_date timestamptz,
  status text,
  synced_at timestamptz not null default now(),
  unique (reservation_code, uh)
);

create index if not exists pms_stays_uh_idx on public.pms_stays (uh);

alter table public.pms_stays enable row level security;

drop policy if exists "Equipe le hospedes do PMS" on public.pms_stays;
create policy "Equipe le hospedes do PMS" on public.pms_stays
  for select using (
    public.has_role(auth.uid(), 'gestor'::app_role)
    or public.has_role(auth.uid(), 'recreador'::app_role)
  );

create table if not exists public.pms_sync_log (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz not null default now(),
  rooms integer not null default 0,
  guests integer not null default 0,
  removed integer not null default 0,
  source text
);

alter table public.pms_sync_log enable row level security;

drop policy if exists "Equipe le log do PMS" on public.pms_sync_log;
create policy "Equipe le log do PMS" on public.pms_sync_log
  for select using (
    public.has_role(auth.uid(), 'gestor'::app_role)
    or public.has_role(auth.uid(), 'recreador'::app_role)
  );
-- =====================================================================
-- Login do hóspede por apartamento + sobrenome (dados do TOTVS)
-- Não diferencia maiúsculas, minúsculas nem acentos.
-- =====================================================================

alter table public.guests add column if not exists pms_stay_key text;
create unique index if not exists guests_pms_stay_key_idx
  on public.guests (pms_stay_key) where pms_stay_key is not null;

-- Deixa o texto sem acento, minúsculo e só com letras
create or replace function public.normalize_name(t text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(translate(coalesce(t, ''),
      'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')),
    '[^a-z]+', ' ', 'g'))
$$;

create or replace function public.guest_login_pms(p_uh text, p_surname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st record;
  g record;
  wanted text[];
  name_words text[];
  w text;
  ok boolean;
  found_stay boolean := false;
  found_guest boolean := false;
  short_name text;
  new_pin text;
  tries integer := 0;
begin
  -- palavras do sobrenome digitado, sem "de/da/do/dos/das/e"
  wanted := array(
    select x from unnest(string_to_array(public.normalize_name(p_surname), ' ')) as x
    where length(x) > 1 and x not in ('de', 'da', 'do', 'dos', 'das', 'e')
  );
  if coalesce(array_length(wanted, 1), 0) = 0 then
    return null;
  end if;

  for st in
    select * from public.pms_stays
    where ltrim(trim(uh), '0') = ltrim(trim(p_uh), '0')
      and (departure_date is null or departure_date > now() - interval '12 hours')
    order by arrival_date desc
  loop
    -- compara com os sobrenomes do titular (todas as palavras menos o primeiro nome)
    name_words := (string_to_array(public.normalize_name(st.guest_name), ' '))[2:];
    ok := true;
    foreach w in array wanted loop
      if not (w = any(name_words)) then
        ok := false;
      end if;
    end loop;
    if ok then
      found_stay := true;
      exit;
    end if;
  end loop;

  if not found_stay then
    return null;
  end if;

  -- já existe hóspede ligado a esta reserva?
  for g in
    select * from public.guests where pms_stay_key = st.reservation_code || '|' || st.uh
  loop
    found_guest := true;
  end loop;

  if found_guest then
    return to_jsonb(g) - 'pin_code';
  end if;

  -- cria o hóspede: primeiro nome + último sobrenome (é o que aparece no ranking)
  short_name := initcap(split_part(trim(st.guest_name), ' ', 1));
  if array_length(string_to_array(trim(st.guest_name), ' '), 1) > 1 then
    short_name := short_name || ' ' || initcap(
      (string_to_array(trim(st.guest_name), ' '))[array_length(string_to_array(trim(st.guest_name), ' '), 1)]
    );
  end if;

  loop
    tries := tries + 1;
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      for g in
        insert into public.guests (name, room_number, pin_code, total_points, pms_stay_key)
        values (short_name, st.uh, new_pin, 50, st.reservation_code || '|' || st.uh)
        returning *
      loop
        found_guest := true;
      end loop;
      exit;
    exception when unique_violation then
      if tries >= 20 then
        raise;
      end if;
    end;
  end loop;

  return (to_jsonb(g) - 'pin_code') || jsonb_build_object('is_new', true);
end;
$$;

revoke all on function public.guest_login_pms(text, text) from public;
grant execute on function public.guest_login_pms(text, text) to anon, authenticated;
-- Datas da estadia do hóspede logado (para a mensagem de boas-vindas e o "último dia")
create or replace function public.guest_stay_info(p_guest_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'uh', s.uh,
    'arrival_date', s.arrival_date,
    'departure_date', s.departure_date
  )
  from public.guests g
  join public.pms_stays s on g.pms_stay_key = s.reservation_code || '|' || s.uh
  where g.id = p_guest_id
  limit 1
$$;

revoke all on function public.guest_stay_info(uuid) from public;
grant execute on function public.guest_stay_info(uuid) to anon, authenticated;
