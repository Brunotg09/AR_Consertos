/*
# Tabela de banners para o carrossel da home

1. Nova Tabela
- `banners`: banners promocionais do site
  - `id` (serial, PK)
  - `title` (text)
  - `subtitle` (text)
  - `image_url` (text, NOT NULL)
  - `link` (text)
  - `active` (boolean, DEFAULT true)
  - `sort_order` (int, DEFAULT 0)
  - `created_at` (timestamptz, DEFAULT now())

2. Segurança
- RLS habilitado
- Leitura pública para banners ativos
- Escrita restrita para admins
*/

CREATE TABLE IF NOT EXISTS banners (
  id serial PRIMARY KEY,
  title text,
  subtitle text,
  image_url text NOT NULL,
  link text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de banners" ON banners;
CREATE POLICY "Leitura pública de banners" ON banners FOR SELECT
  TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "Escrita de banners restrita para admins" ON banners;
CREATE POLICY "Escrita de banners restrita para admins" ON banners
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tabela para serviços ocultos pelo admin
CREATE TABLE IF NOT EXISTS hidden_services (
  id serial PRIMARY KEY,
  service_id text NOT NULL UNIQUE,
  hidden_at timestamptz DEFAULT now()
);

ALTER TABLE hidden_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin acesso a hidden_services" ON hidden_services;
CREATE POLICY "Admin acesso a hidden_services" ON hidden_services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
