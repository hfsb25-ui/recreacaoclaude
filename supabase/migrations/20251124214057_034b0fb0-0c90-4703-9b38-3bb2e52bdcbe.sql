-- Add room_number column to activity_ratings table
ALTER TABLE public.activity_ratings 
ADD COLUMN room_number text;