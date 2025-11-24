-- Add reset_time column to reset_config table
ALTER TABLE reset_config 
ADD COLUMN reset_time TIME DEFAULT '00:00:00';