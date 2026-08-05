-- ============================================================
-- Migration: Fix banners system - storage bucket, columns, triggers
-- ============================================================

-- 1. Adicionar colunas de customização aos banners
ALTER TABLE banners ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#E30613';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_label text DEFAULT 'Saiba Mais';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS icon_name text; -- NULL = usa imagem; valor = usa ícone
ALTER TABLE banners ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Tornar image_url nullable (banners com ícone nao precisam de imagem)
ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS banners_updated_at ON banners;
CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

-- 4. Storage bucket para banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Politicas de storage para banners
-- Leitura publica (banners sao exibidos no carrossel da home)
DROP POLICY IF EXISTS "Banner public read" ON storage.objects;
CREATE POLICY "Banner public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'banners');

-- Admin pode inserir
DROP POLICY IF EXISTS "Banner insert admin" ON storage.objects;
CREATE POLICY "Banner insert admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners' AND is_admin());

-- Admin pode atualizar
DROP POLICY IF EXISTS "Banner update admin" ON storage.objects;
CREATE POLICY "Banner update admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners' AND is_admin())
WITH CHECK (bucket_id = 'banners' AND is_admin());

-- Admin pode deletar
DROP POLICY IF EXISTS "Banner delete admin" ON storage.objects;
CREATE POLICY "Banner delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners' AND is_admin());

-- 6. Inserir banners estaticos como banners normais
INSERT INTO banners (title, subtitle, image_url, link, active, sort_order, accent_color, cta_label, icon_name)
VALUES
  ('CONSERTO DE ELETRODOMÉSTICOS', 'Linha branca, pequenos eletrodomésticos e climatização', NULL, '/servicos', true, 1, '#E30613', 'Ver Serviços', 'Wrench'),
  ('ELETRÔNICA AVANÇADA INVERTER', 'Reparo de placas de ar-condicionado inverter, inversores solares e fontes chaveadas', NULL, '/inverter', true, 2, '#8B5CF6', 'Ver Inverter', 'Cpu'),
  ('GARANTIA DE 90 DIAS', 'Confiança e qualidade em cada reparo. Atendimento em Itabaiana/SE desde 2017.', NULL, '/contato', true, 3, '#C9A84C', 'Fale Conosco', 'Award')
ON CONFLICT DO NOTHING;

-- 7. Tambem adicionar updated_at para products (consistencia)
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();
