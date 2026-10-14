-- Emoji de cada faixa etária (aparece no cartão da Programação). Vazio = o app escolhe pelo nome.
ALTER TABLE public.age_groups ADD COLUMN IF NOT EXISTS emoji text;
