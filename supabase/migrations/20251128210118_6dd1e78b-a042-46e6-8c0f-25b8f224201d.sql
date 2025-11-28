-- Add splash screen configuration fields to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN splash_title TEXT DEFAULT 'Recreação Hotel',
ADD COLUMN splash_subtitle TEXT DEFAULT 'Sua programação de atividades',
ADD COLUMN splash_duration INTEGER DEFAULT 2000,
ADD COLUMN splash_gradient_from TEXT DEFAULT '192 92% 60%',
ADD COLUMN splash_gradient_via TEXT DEFAULT '280 80% 65%',
ADD COLUMN splash_gradient_to TEXT DEFAULT '340 85% 70%';