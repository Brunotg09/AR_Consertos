-- Migration: Adicionar campos de personalização aos banners
-- Rodar no Supabase SQL Editor

-- 1. Adicionar novas colunas
ALTER TABLE banners ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#E30613';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_label text DEFAULT 'Saiba Mais';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS icon_name text; -- NULL = usa imagem; valor = usa ícone

-- 2. Tornar image_url nullable (banners com ícone não precisam de imagem)
ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;

-- 3. Inserir os 3 banners estáticos como banners normais
INSERT INTO banners (title, subtitle, image_url, link, active, sort_order, accent_color, cta_label, icon_name)
VALUES
  ('CONSERTO DE ELETRODOMÉSTICOS', 'Linha branca, pequenos eletrodomésticos e climatização', NULL, '/servicos', true, 1, '#E30613', 'Ver Serviços', 'Wrench'),
  ('ELETRÔNICA AVANÇADA INVERTER', 'Reparo de placas de ar-condicionado inverter, inversores solares e fontes chaveadas', NULL, '/inverter', true, 2, '#8B5CF6', 'Ver Inverter', 'Cpu'),
  ('GARANTIA DE 90 DIAS', 'Confiança e qualidade em cada reparo. Atendimento em Itabaiana/SE desde 2017.', NULL, '/contato', true, 3, '#C9A84C', 'Fale Conosco', 'Award')
ON CONFLICT DO NOTHING;
