-- Adicionar campos para botão opcional nos anúncios
ALTER TABLE public.announcements 
ADD COLUMN button_text text DEFAULT NULL,
ADD COLUMN button_url text DEFAULT NULL;