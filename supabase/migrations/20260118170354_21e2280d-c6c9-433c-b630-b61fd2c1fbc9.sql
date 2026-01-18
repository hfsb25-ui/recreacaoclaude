-- Add unique constraint: one rating per guest per activity
CREATE UNIQUE INDEX idx_unique_guest_activity_rating 
ON public.activity_ratings (guest_id, activity_id) 
WHERE guest_id IS NOT NULL;