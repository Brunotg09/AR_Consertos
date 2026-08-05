-- ============================================================
-- TABELA: services + dados iniciais
-- Cole este SQL no painel do Supabase > SQL Editor > New query
-- ============================================================

-- 1. Criar tabela
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

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_service_id ON services(service_id);

-- 3. RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Leitura pública
DROP POLICY IF EXISTS "Leitura publica de servicos ativos" ON services;
CREATE POLICY "Leitura publica de servicos ativos" ON services FOR SELECT
  TO anon, authenticated USING (active = true);

-- Admin pode tudo (via is_admin function - consistente com o layout /private)
DROP POLICY IF EXISTS "Admin manage services" ON services;
CREATE POLICY "Admin manage services" ON services FOR ALL
  TO authenticated USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Grants
GRANT SELECT ON services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON services TO authenticated;

-- 5. Trigger updated_at
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

-- ============================================================
-- 6. DADOS INICIAIS (seed)
-- ============================================================

INSERT INTO services (service_id, name, description, category, type, discount_percentage, badge_garantia, icon_name, active, sort_order) VALUES

-- LINHA BRANCA
('lb-maquina-lavar', 'MÁQUINA DE LAVAR', 'Conserto e manutenção completa, troca de rolamentos, placa e atuadores.', 'Linha Branca', 'convencional', 10, 'GARANTIA 90 DIAS', 'WashingMachine', true, 1),
('lb-maquina-lava-seca', 'MÁQUINA LAVA E SECA', 'Reparo especializado em sistemas de secagem e placas eletrônicas.', 'Linha Branca', 'convencional', 10, 'GARANTIA 90 DIAS', 'WashingMachine', true, 2),
('lb-geladeira', 'GELADEIRA', 'Carga de gás, troca de motor/compressor e reparo de ciclo de degelo.', 'Linha Branca', 'convencional', 10, 'GARANTIA 90 DIAS', 'Refrigerator', true, 3),
('lb-adega', 'ADEGA', 'Manutenção em adegas climatizadas, compressor ou pastilha peltier.', 'Linha Branca', 'convencional', 5, 'GARANTIA 90 DIAS', 'Wine', true, 4),
('lb-tanquinho', 'TANQUINHO', 'Troca de batedor, correia, motor e vazamentos gerais.', 'Linha Branca', 'convencional', 5, 'GARANTIA 90 DIAS', 'WashingMachine', true, 5),
('lb-bebedouro', 'BEBEDOURO', 'Conserto de sistema de refrigeração por compressor ou eletrônico.', 'Linha Branca', 'convencional', 5, 'GARANTIA 90 DIAS', 'CupSoda', true, 6),

-- PEQUENOS ELETRODOMÉSTICOS
('pe-sanduicheira', 'SANDUICHEIRA', 'Troca de termostato, fusível térmico e fiação interna.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'Flame', true, 7),
('pe-air-fryer', 'AIR FRYER', 'Reparo no timer, resistência que não esquenta e placas de controle.', 'Pequenos Eletrodomésticos', 'convencional', 10, 'GARANTIA 90 DIAS', 'CookingPot', true, 8),
('pe-cafeteira', 'CAFETEIRA', 'Desentupimento, troca de bomba de pressão e placas.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'Coffee', true, 9),
('pe-liquidificador', 'LIQUIDIFICADOR', 'Troca de carvão, motor queimado, acoplamento e arrastador.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'Blender', true, 10),
('pe-batedeira', 'BATEDEIRA', 'Conserto de engrenagens, controle de velocidade e motores planetários.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'ChefHat', true, 11),
('pe-micro-ondas', 'MICRO-ONDAS', 'Troca de magnetron, membrana de botões, transformador e alta tensão.', 'Pequenos Eletrodomésticos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Zap', true, 12),
('pe-forno-eletrico', 'FORNO ELÉTRICO', 'Manutenção de resistências, chaves seletoras e isolamento térmico.', 'Pequenos Eletrodomésticos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Flame', true, 13),
('pe-ferro', 'FERRO', 'Reparo de cabo elétrico, limpeza de dutos de vapor e termostatos.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'Zap', true, 14),
('pe-prancha', 'PRANCHA (CABELO)', 'Conserto de cabo giratório, placas de cerâmica e circuitos internos.', 'Pequenos Eletrodomésticos', 'convencional', 5, 'GARANTIA 90 DIAS', 'Scissors', true, 15),

-- CLIMATIZAÇÃO
('cl-climatizador', 'CLIMATIZADOR', 'Troca da colmeia, bomba de água e motores de ventilação.', 'Climatização', 'convencional', 10, 'GARANTIA 90 DIAS', 'Wind', true, 16),
('cl-higienizacao-lavar', 'HIGIENIZAÇÃO PREVENTIVA MÁQUINA DE LAVAR', 'Desmontagem completa do tanque para remoção de resíduos e fungos.', 'Climatização', 'convencional', 10, 'GARANTIA 90 DIAS', 'Sparkles', true, 17),
('cl-higienizacao-ar', 'HIGIENIZAÇÃO AR CONDICIONADO', 'Limpeza química profunda de evaporadora e condensadora com bactericida.', 'Climatização', 'convencional', 15, 'GARANTIA 90 DIAS', 'Wind', true, 18),

-- FERRAMENTAS E EQUIPAMENTOS
('fe-parafusadeira', 'PARAFUSADEIRA', 'Reparo de gatilho, mandril, substituição de escovas de carvão e engrenagens.', 'Ferramentas e Equipamentos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Hammer', true, 19),
('fe-makita', 'MAKITA (LIXADEIRA ANGULAR)', 'Troca de induzido, estator, rolamentos e cabos elétricos.', 'Ferramentas e Equipamentos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Construction', true, 20),
('fe-lixadeira', 'LIXADEIRA', 'Manutenção corretiva mecânica e elétrica de lixadeiras orbitais e de cinta.', 'Ferramentas e Equipamentos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Construction', true, 21),
('fe-aspirador', 'ASPIRADOR', 'Substituição de motores de alta rotação, filtros e vedação de ar.', 'Ferramentas e Equipamentos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Wind', true, 22),
('fe-wap', 'WAP (LAVADORA DE ALTA PRESSÃO)', 'Reparo de cabeçote de válvulas, troca de reparos, gaxetas e óleo do motor.', 'Ferramentas e Equipamentos', 'convencional', 10, 'GARANTIA 90 DIAS', 'Droplet', true, 23),

-- ENTRETENIMENTO E MOBILIDADE
('em-ventilador', 'VENTILADOR', 'Troca de buchas, eixos, capacitores de partida e rebobinagem de motor.', 'Entretenimento e Mobilidade', 'convencional', 5, 'GARANTIA 90 DIAS', 'Fan', true, 24),
('em-radio-bluetooth', 'RÁDIO BLUETOOTH', 'Reparo em conectores de carga estourados (Type-C/Micro USB) e troca de baterias.', 'Entretenimento e Mobilidade', 'convencional', 5, 'GARANTIA 90 DIAS', 'Radio', true, 25),
('em-scooter-eletrica', 'SCOOTER ELÉTRICA', 'Manutenção do pack de baterias, módulo controlador e motor hub da roda.', 'Entretenimento e Mobilidade', 'convencional', 10, 'GARANTIA 90 DIAS', 'Bike', true, 26),

-- ELETRÔNICA AVANÇADA INVERTER
('inv-ar-condicionado', 'AR CONDICIONADO INVERTER', 'Reparo avançado em laboratório da placa controladora interna e externa (IPM, barramento DC).', 'Eletrônica Avançada Inverter', 'inverter', 15, 'ALTA PRECISÃO - GARANTIA 90 DIAS', 'Cpu', true, 27),
('inv-inversores-solares', 'INVERSORES SOLARES', 'Análise de circuito de potência, substituição de IGBTs danificados e correção de erros críticos.', 'Eletrônica Avançada Inverter', 'inverter', 15, 'ALTA PRECISÃO - GARANTIA 90 DIAS', 'Sun', true, 28),
('inv-fontes-chaveadas', 'FONTES CHAVEADAS', 'Reparo de fontes industriais, retificadores e fontes de alimentação de alta corrente.', 'Eletrônica Avançada Inverter', 'inverter', 10, 'ALTA PRECISÃO - GARANTIA 90 DIAS', 'Zap', true, 29)

ON CONFLICT (service_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  discount_percentage = EXCLUDED.discount_percentage,
  badge_garantia = EXCLUDED.badge_garantia,
  icon_name = EXCLUDED.icon_name,
  updated_at = now();
