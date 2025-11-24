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