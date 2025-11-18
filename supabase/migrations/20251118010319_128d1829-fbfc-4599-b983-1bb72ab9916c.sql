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