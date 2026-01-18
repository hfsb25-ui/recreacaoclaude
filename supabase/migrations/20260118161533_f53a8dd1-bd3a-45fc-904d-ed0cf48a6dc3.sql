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