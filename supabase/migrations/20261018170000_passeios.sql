-- Passeios na região: lugares cadastrados pelo hotel no painel (aba "Passeios").
-- As fotos ficam no mesmo armazenamento dos anúncios, na pasta passeios/.

CREATE TABLE IF NOT EXISTS public.passeios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cidade text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'natureza',
  resumo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  distancia text NOT NULL DEFAULT '',
  duracao text NOT NULL DEFAULT '',
  funcionamento text NOT NULL DEFAULT '',
  preco text NOT NULL DEFAULT '',
  dicas text NOT NULL DEFAULT '',
  mapa text NOT NULL DEFAULT '',
  criancas boolean NOT NULL DEFAULT false,
  chuva boolean NOT NULL DEFAULT false,
  agendar boolean NOT NULL DEFAULT false,
  imagem text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS passeios_ordem_idx ON public.passeios (ordem);

ALTER TABLE public.passeios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos veem passeios ativos" ON public.passeios;
CREATE POLICY "Todos veem passeios ativos" ON public.passeios
  FOR SELECT USING (ativo OR public.has_role(auth.uid(), 'gestor'::app_role));
DROP POLICY IF EXISTS "Gestores gerenciam passeios" ON public.passeios;
CREATE POLICY "Gestores gerenciam passeios" ON public.passeios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

-- Exemplos para começar (desligados: confira, troque a foto e ligue no painel)
INSERT INTO public.passeios (nome, cidade, categoria, resumo, descricao, distancia, duracao, funcionamento, preco, dicas, mapa, criancas, chuva, agendar, ativo, ordem)
SELECT * FROM (VALUES
  ('Centro Histórico de Vassouras', 'Vassouras', 'historia',
   'Casarões do tempo do café, praça arborizada e igreja matriz.',
   'Passeio a pé pelo centro de uma das cidades mais importantes do ciclo do café. A praça é ótima para um sorvete e para as crianças correrem.',
   '≈ 40 min de carro', '2 a 3 horas', 'Todos os dias', 'Gratuito',
   E'Vá de manhã, quando está mais fresco\nLeve calçado confortável', 'Centro Histórico Vassouras RJ', true, false, false, false, 1),
  ('Lago de Javary', 'Miguel Pereira', 'natureza',
   'Lago cercado de verde, bom para caminhar e fazer piquenique.',
   'Um dos cartões-postais de Miguel Pereira, com caminho ao redor do lago, bancos e quiosques.',
   '≈ 35 min de carro', '1 a 2 horas', 'Todos os dias, de dia', 'Gratuito',
   E'Leve repelente\nFim de tarde tem a luz mais bonita', 'Lago de Javary Miguel Pereira RJ', true, false, false, false, 2),
  ('Conservatória', 'Valença', 'historia',
   'A cidade das serestas: música pelas ruas nas noites de fim de semana.',
   'Distrito de Valença famoso pelas serestas e serenatas nas noites de sexta e sábado, com restaurantes de comida caseira.',
   '≈ 1h30 de carro', 'Noite ou dia inteiro', 'Serestas às sextas e sábados à noite', 'Gratuito',
   E'Melhor no fim de semana\nReserve o restaurante antes', 'Conservatória Valença RJ', false, false, false, false, 3)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM public.passeios);
