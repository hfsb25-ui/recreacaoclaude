-- Add weather location fields to site_settings table
ALTER TABLE site_settings 
ADD COLUMN weather_latitude DECIMAL(10, 8),
ADD COLUMN weather_longitude DECIMAL(11, 8),
ADD COLUMN weather_city_name TEXT;

COMMENT ON COLUMN site_settings.weather_latitude IS 'Latitude for weather location';
COMMENT ON COLUMN site_settings.weather_longitude IS 'Longitude for weather location';
COMMENT ON COLUMN site_settings.weather_city_name IS 'City name for weather display';