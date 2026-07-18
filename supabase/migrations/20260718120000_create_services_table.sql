-- ============================================================
-- TABELA: services (catálogo de serviços editável pelo admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS services (
  id serial PRIMARY KEY,
  service_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  type text NOT NULL CHECK (type IN ('convencional', 'inverter')),
  price decimal(10,2),
  discount_percentage int DEFAULT 0,
  badge_garantia text DEFAULT 'GARANTIA 90 DIAS',
  icon_name text,
  images text[] DEFAULT '{}',
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_service_id ON services(service_id);

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Leitura pública de serviços ativos
DROP POLICY IF EXISTS "Leitura publica de servicos ativos" ON services;
CREATE POLICY "Leitura publica de servicos ativos" ON services FOR SELECT
  TO anon, authenticated USING (active = true);

-- Admin pode tudo (via is_admin function)
DROP POLICY IF EXISTS "Admin manage services" ON services;
CREATE POLICY "Admin manage services" ON services FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_private 
      WHERE id = auth.uid() 
      AND email LIKE '%@arconsertos.com.br'
    )
  );

-- Grants
GRANT SELECT ON services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON services TO authenticated;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();
