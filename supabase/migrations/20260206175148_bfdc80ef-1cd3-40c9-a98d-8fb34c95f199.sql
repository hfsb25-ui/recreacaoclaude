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