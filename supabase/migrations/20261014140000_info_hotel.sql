-- Informações do hotel editáveis no painel (horários, Wi-Fi, ramais, WhatsApp).
-- Uma linha só (id = 1). Todo mundo lê; só gestor altera.
CREATE TABLE IF NOT EXISTS public.hotel_info (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  horarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  wifi_rede text,
  wifi_senha text,
  wifi_mostrar boolean NOT NULL DEFAULT true,
  whatsapp text,
  whatsapp_mensagem text,
  ramais jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos leem informações do hotel" ON public.hotel_info;
CREATE POLICY "Todos leem informações do hotel" ON public.hotel_info
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestores editam informações do hotel" ON public.hotel_info;
CREATE POLICY "Gestores editam informações do hotel" ON public.hotel_info
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

GRANT SELECT ON public.hotel_info TO anon, authenticated;
GRANT INSERT, UPDATE ON public.hotel_info TO authenticated;

-- Dados atuais (só entra se ainda não existir)
INSERT INTO public.hotel_info (id, horarios, wifi_rede, wifi_senha, wifi_mostrar, whatsapp, whatsapp_mensagem, ramais)
VALUES (
  1,
  '[{"nome":"Café da manhã","horario":"7h30 às 10h","visivel":true},
    {"nome":"Almoço","horario":"12h às 14h30","visivel":true},
    {"nome":"Lanche da tarde","horario":"16h às 17h","visivel":true},
    {"nome":"Jantar","horario":"19h às 21h30","visivel":true},
    {"nome":"Piscinas","horario":"10h às 18h45","visivel":true},
    {"nome":"Check-out","horario":"","visivel":false}]'::jsonb,
  'Hóspedes', 'hfsb2024', true,
  '5524999680997', 'Olá! Sou hóspede do apto {apto}.',
  '[{"nome":"Recepção","ramal":"9","urgente":false},
    {"nome":"Emergência","ramal":"402","urgente":true}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
