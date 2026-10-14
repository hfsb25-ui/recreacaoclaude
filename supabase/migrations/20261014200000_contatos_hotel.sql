-- Outros contatos de WhatsApp (farmácia, táxi, passeios…) na tela "O hotel"
ALTER TABLE public.hotel_info ADD COLUMN IF NOT EXISTS contatos jsonb NOT NULL DEFAULT '[]'::jsonb;
