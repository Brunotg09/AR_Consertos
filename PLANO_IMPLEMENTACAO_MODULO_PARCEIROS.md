# 🛠️ AR Consertos — Plano de Implementação Detalhado

## Módulo de Empresas Parceiras, OS Multi-Tenant e Assinaturas Recorrentes

**Versão:** 2.0
**Data:** 01/09/2026
**Status:** Fase 1 — Especificação & Schema

---

## 1. Visão Geral

Expansão da operação da **AR Consertos** integrando empresas terceirizadas (parceiras) para execução de serviços avulsos e planos de assinatura recorrentes em campo.

**Premissas confirmadas:**
- Cliente contrata pelo mesmo fluxo existente (carrinho → checkout)
- Técnicos acessam via **PWA responsivo** (`/parceiro/tecnico`)
- Assinaturas: geração automática de OS, **cobrança manual** (sem gateway)
- Multi-tenant real com **RLS por `partner_id`**
- Pagamentos: **apenas registro** (sem integração com gateway)

**Stack atual:** Next.js 13 (App Router) + Supabase (PostgreSQL + Auth + Storage) + shadcn/ui + Tailwind + PWA (next-pwa)

---

## 2. Níveis de Acesso e Permissões

| Perfil (`role`) | Escopo | Rotas | Responsabilidades |
|---|---|---|---|
| `admin` | Plataforma Global | `/private/*` | Cadastrar parceiros, criar OSs manuais, definir planos, atribuir chamados, gerenciar relatórios financeiros |
| `partner_gestor` | Tenant do Parceiro | `/parceiro/*` | Cadastrar técnicos, visualizar chamados atribuídos, delegar OSs para técnicos, monitorar execuções |
| `partner_tech` | App do Técnico | `/parceiro/tecnico/*` | Visualizar lista do dia, navegar via GPS, check-in com CPF, preencher laudo, enviar fotos e assinatura |
| `client` | Portal do Cliente | `/`, `/checkout`, `/minha-conta` | Contratar serviços, acompanhar status, consultar histórico |

---

## 3. Schema do Banco de Dados

### 3.1. Tabela `partners` (Empresa Parceira)

```sql
CREATE TABLE IF NOT EXISTS partners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                          -- Razão social / nome da empresa
  cnpj          text NOT NULL UNIQUE,                   -- CNPJ (identificador fiscal)
  email         text NOT NULL,                          -- E-mail principal de contato
  phone         text,                                   -- Telefone / WhatsApp
  address       jsonb,                                  -- Endereço da empresa {rua, numero, bairro, cidade, estado, cep}
  active        boolean DEFAULT true,                   -- Ativo / Inativo
  notes         text,                                   -- Observações internas
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_cnpj ON partners(cnpj);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(active);
```

### 3.2. Tabela `user_roles` (Controle de Papéis)

```sql
CREATE TYPE user_role_type AS ENUM (
  'admin',
  'partner_gestor',
  'partner_tech',
  'client'
);

CREATE TABLE IF NOT EXISTS user_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          user_role_type NOT NULL,
  partner_id    uuid REFERENCES partners(id) ON DELETE CASCADE,  -- NULL para admin/client
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_partner_id ON user_roles(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
```

### 3.3. Tabela `partner_technicians` (Técnicos Vinculados)

```sql
CREATE TABLE IF NOT EXISTS partner_technicians (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cpf           text NOT NULL,                           -- CPF para validação em campo
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_tech_partner_id ON partner_technicians(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_tech_user_id ON partner_technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_tech_cpf ON partner_technicians(cpf);
```

### 3.4. Tabela `service_orders` (OS de Campo)

```sql
CREATE TABLE IF NOT EXISTS service_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid REFERENCES orders(id) ON DELETE SET NULL,        -- OS original (avulso)
  subscription_id   uuid REFERENCES subscriptions(id) ON DELETE SET NULL, -- Assinatura vinculada
  partner_id        uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  technician_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,      -- Técnico atribuído
  client_name       text NOT NULL,
  client_cpf        text,                                                  -- CPF do cliente (validação check-in)
  client_phone      text,
  address           text NOT NULL,                                         -- Endereço completo do atendimento
  latitude          decimal(10,8),                                         -- GPS latitude
  longitude         decimal(11,8),                                         -- GPS longitude
  scheduled_date    timestamptz NOT NULL,                                  -- Data/hora agendada
  status            text DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',            -- Criada, aguardando atribuição ao parceiro
                      'assigned_partner',   -- Atribuída ao parceiro, aguardando gestor
                      'assigned_tech',      -- Gestor delegou ao técnico
                      'in_progress',        -- Técnico fez check-in
                      'completed',          -- Técnico finalizou com evidências
                      'cancelled'           -- Cancelada
                    )),
  tech_notes        text,                                                  -- Laudo técnico / observações
  photos            jsonb DEFAULT '[]',                                    -- [{url, type: 'before'|'after', uploaded_at}]
  client_signature  text,                                                  -- Assinatura digital (base64 canvas)
  checked_in_at     timestamptz,                                           -- Timestamp do check-in
  completed_at      timestamptz,                                           -- Timestamp da conclusão
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_partner_id ON service_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_so_technician_id ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_scheduled_date ON service_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_so_order_id ON service_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_so_subscription_id ON service_orders(subscription_id);
```

### 3.5. Tabela `subscriptions` (Contratos de Assinatura)

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  title           text NOT NULL,                          -- Nome do plano (ex: "Manutenção Preventiva Ar-Condicionado")
  description     text,                                   -- Descrição do serviço recorrente
  monthly_value   decimal(10,2) NOT NULL,                 -- Valor mensal
  billing_day     int NOT NULL CHECK (billing_day BETWEEN 1 AND 28), -- Dia do mês para visita/cobrança
  status          text DEFAULT 'active'
                  CHECK (status IN (
                    'active',      -- Contrato ativo
                    'paused',      -- Pausado temporariamente
                    'overdue',     -- Inadimplente (pagamento manual pendente)
                    'cancelled'    -- Cancelado
                  )),
  start_date      date NOT NULL,                          -- Data de início
  next_billing    date NOT NULL,                          -- Próxima data de visita/cobrança
  notes           text,                                   -- Observações
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_client ON subscriptions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_sub_partner ON subscriptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_next_billing ON subscriptions(next_billing);
```

### 3.6. Alterações em Tabelas Existentes

#### `services` — adicionar vinculação a parceiro

```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_partner_service boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_services_partner_id ON services(partner_id);
```

- `partner_id = NULL` → serviço executado pela AR Consertos (fluxo atual)
- `partner_id = uuid` → serviço executado por parceiro terceirizado

#### `order_items` — adicionar vinculação a OS de campo

```sql
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL;
```

### 3.7. Tabela `service_order_photos` (Upload de Fotos)

```sql
CREATE TABLE IF NOT EXISTS service_order_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  url             text NOT NULL,                          -- URL pública da foto
  photo_type      text NOT NULL CHECK (photo_type IN ('before', 'after')),
  uploaded_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_photos_order ON service_order_photos(service_order_id);
```

### 3.8. Bucket de Storage

```sql
-- Criar bucket privado para fotos de OS
INSERT INTO storage.buckets (id, name, public) VALUES ('service-order-photos', 'service-order-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: apenas autenticados vinculados à OS podem ler
CREATE POLICY "tech_upload_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-order-photos');

CREATE POLICY "read_own_so_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-order-photos'
    AND (
      -- Admin pode ver tudo
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
      -- Gestor do parceiro pode ver fotos das OSs da empresa
      OR EXISTS (
        SELECT 1 FROM service_orders so
        JOIN user_roles ur ON ur.partner_id = so.partner_id
        WHERE ur.user_id = auth.uid() AND ur.role = 'partner_gestor'
        AND so.id::text = (storage.foldername(name))[1]
      )
      -- Técnico pode ver fotos das suas próprias OSs
      OR EXISTS (
        SELECT 1 FROM service_orders so
        WHERE so.technician_id = auth.uid()
        AND so.id::text = (storage.foldername(name))[1]
      )
    )
  );
```

---

## 4. Row Level Security (RLS) — Multi-Tenant

### 4.1. Habilitar RLS nas novas tabelas

```sql
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;
```

### 4.2. Políticas `partners`

```sql
-- Admin pode tudo
CREATE POLICY "admin_full_access_partners" ON partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Gestor do parceiro pode ver sua própria empresa
CREATE POLICY "gestor_read_own_partner" ON partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = partners.id
    )
  );
```

### 4.3. Políticas `user_roles`

```sql
-- Admin pode tudo
CREATE POLICY "admin_full_access_roles" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Gestor pode ver/criar usuários do seu partner
CREATE POLICY "gestor_manage_own_partner_users" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'partner_gestor'
      AND ur.partner_id = user_roles.partner_id
    )
  );

CREATE POLICY "gestor_insert_own_partner_users" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'partner_gestor'
      AND ur.partner_id = user_roles.partner_id
    )
  );
```

### 4.4. Políticas `partner_technicians`

```sql
-- Admin pode tudo
CREATE POLICY "admin_full_access_partner_tech" ON partner_technicians
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Gestor vê/gerencia técnicos do seu partner
CREATE POLICY "gestor_see_own_techs" ON partner_technicians
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = partner_technicians.partner_id
    )
  );

CREATE POLICY "gestor_manage_own_techs" ON partner_technicians
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = partner_technicians.partner_id
    )
  );

CREATE POLICY "gestor_update_own_techs" ON partner_technicians
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = partner_technicians.partner_id
    )
  );
```

### 4.5. Políticas `service_orders`

```sql
-- Admin pode tudo
CREATE POLICY "admin_full_access_so" ON service_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Gestor vê/gerencia OSs do seu partner
CREATE POLICY "gestor_see_own_partner_so" ON service_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = service_orders.partner_id
    )
  );

CREATE POLICY "gestor_update_own_partner_so" ON service_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = service_orders.partner_id
    )
  );

-- Técnico vê apenas suas OSs atribuídas
CREATE POLICY "tech_see_own_so" ON service_orders
  FOR SELECT USING (
    technician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_tech'
    )
  );

-- Técnico pode atualizar suas OSs (check-in, completar)
CREATE POLICY "tech_update_own_so" ON service_orders
  FOR UPDATE USING (
    technician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_tech'
    )
  );

-- Cliente vê OSs vinculadas ao seu pedido
CREATE POLICY "client_see_own_so" ON service_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = service_orders.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

### 4.6. Políticas `subscriptions`

```sql
-- Admin pode tudo
CREATE POLICY "admin_full_access_subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Gestor vê assinaturas do seu partner
CREATE POLICY "gestor_see_own_partner_subs" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'partner_gestor'
      AND partner_id = subscriptions.partner_id
    )
  );

-- Cliente vê suas próprias assinaturas
CREATE POLICY "client_see_own_subs" ON subscriptions
  FOR SELECT USING (
    client_user_id = auth.uid()
  );
```

---

## 5. Database Functions (RPC)

### 5.1. Criar OS de campo a partir de um pedido

```sql
CREATE OR REPLACE FUNCTION create_service_order(
  p_order_id uuid,
  p_partner_id uuid,
  p_client_name text,
  p_client_cpf text,
  p_client_phone text,
  p_address text,
  p_scheduled_date timestamptz,
  p_latitude decimal DEFAULT NULL,
  p_longitude decimal DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_so_id uuid;
BEGIN
  INSERT INTO service_orders (
    order_id, partner_id, client_name, client_cpf,
    client_phone, address, scheduled_date, latitude, longitude, status
  ) VALUES (
    p_order_id, p_partner_id, p_client_name, p_client_cpf,
    p_client_phone, p_address, p_scheduled_date, p_latitude, p_longitude,
    'assigned_partner'
  ) RETURNING id INTO v_so_id;

  -- Atualizar partner_id no order_item correspondente
  UPDATE order_items
  SET partner_id = p_partner_id, service_order_id = v_so_id
  WHERE order_id = p_order_id AND item_type = 'servico';

  RETURN v_so_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2. Delegar OS para técnico

```sql
CREATE OR REPLACE FUNCTION delegate_service_order(
  p_so_id uuid,
  p_technician_id uuid
) RETURNS boolean AS $$
BEGIN
  UPDATE service_orders
  SET technician_id = p_technician_id, status = 'assigned_tech', updated_at = now()
  WHERE id = p_so_id AND status = 'assigned_partner';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3. Check-in do técnico

```sql
CREATE OR REPLACE FUNCTION tech_checkin(
  p_so_id uuid,
  p_client_cpf_input text
) RETURNS boolean AS $$
DECLARE
  v_record service_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_record FROM service_orders WHERE id = p_so_id;

  IF v_record IS NULL THEN RETURN FALSE; END IF;
  IF v_record.technician_id != auth.uid() THEN RETURN FALSE; END IF;

  -- Validar CPF (se cadastrado na OS)
  IF v_record.client_cpf IS NOT NULL AND v_record.client_cpf != p_client_cpf_input THEN
    RETURN FALSE;
  END IF;

  UPDATE service_orders
  SET status = 'in_progress', checked_in_at = now(), updated_at = now()
  WHERE id = p_so_id AND status = 'assigned_tech';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.4. Completar OS (com validação de evidências)

```sql
CREATE OR REPLACE FUNCTION complete_service_order(
  p_so_id uuid,
  p_tech_notes text,
  p_photos jsonb,
  p_client_signature text
) RETURNS boolean AS $$
DECLARE
  v_has_before boolean;
  v_has_after boolean;
BEGIN
  -- Validar evidências obrigatórias
  SELECT
    BOOL_OR((p_photos->>photo_type) = 'before'),
    BOOL_OR((p_photos->>photo_type) = 'after')
  INTO v_has_before, v_has_after;

  IF NOT v_has_before OR NOT v_has_after THEN
    RAISE EXCEPTION 'É obrigatório ter pelo menos 1 foto antes e 1 foto depois';
  END IF;

  IF p_tech_notes IS NULL OR trim(p_tech_notes) = '' THEN
    RAISE EXCEPTION 'O laudo técnico é obrigatório';
  END IF;

  IF p_client_signature IS NULL OR trim(p_client_signature) = '' THEN
    RAISE EXCEPTION 'A assinatura do cliente é obrigatória';
  END IF;

  UPDATE service_orders
  SET
    status = 'completed',
    tech_notes = p_tech_notes,
    photos = p_photos,
    client_signature = p_client_signature,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_so_id AND status = 'in_progress' AND technician_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.5. Gerar OSs de assinatura (Cron)

```sql
CREATE OR REPLACE FUNCTION generate_subscription_os()
RETURNS int AS $$
DECLARE
  v_sub RECORD;
  v_count int := 0;
  v_next_month date;
BEGIN
  FOR v_sub IN
    SELECT s.*, p.name as partner_name
    FROM subscriptions s
    WHERE s.status = 'active'
    AND s.next_billing <= CURRENT_DATE + INTERVAL '5 days'
  LOOP
    -- Criar OS de campo
    INSERT INTO service_orders (
      subscription_id, partner_id, client_name, client_phone,
      address, scheduled_date, status
    ) SELECT
      v_sub.id,
      v_sub.partner_id,
      COALESCE(p.full_name, 'Cliente'),
      p.phone,
      COALESCE(p.address->>'rua', '') || ', ' ||
        COALESCE(p.address->>'numero', '') || ' - ' ||
        COALESCE(p.address->>'bairro', '') || ', ' ||
        COALESCE(p.address->>'localidade', '') || '/' ||
        COALESCE(p.address->>'uf', ''),
      make_date(
        EXTRACT(YEAR FROM v_sub.next_billing)::int,
        EXTRACT(MONTH FROM v_sub.next_billing)::int,
        v_sub.billing_day
      )::timestamptz,
      'assigned_partner'
    FROM profiles p
    WHERE p.id = v_sub.client_user_id;

    -- Calcular próximo mês
    v_next_month := v_sub.next_billing + INTERVAL '1 month';

    -- Atualizar next_billing
    UPDATE subscriptions
    SET next_billing = v_next_month, updated_at = now()
    WHERE id = v_sub.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Fluxos Operacionais

### 6.1. Atribuição e Execução de Chamado Avulso

```
[Cliente] ──► Seleciona serviço parceiro no catálogo
    │         Adiciona ao carrinho → Checkout (fluxo existente)
    │         Cria order + order_items (partner_id preenchido)
    ▼
[Admin AR Consertos] ──► /private/pedidos
    │    Visualiza OS pendente com badge "Parceiro"
    │    Seleciona empresa parceira responsável
    │    Clique "Atribuir Parceiro" → chama create_service_order()
    ▼
[Gestor do Parceiro] ──► /parceiro/chamados
    │    Visualiza OS atribuída à empresa
    │    Delega para técnico específico → chama delegate_service_order()
    ▼
[Técnico de Campo] ──► /parceiro/tecnico/hoje
    │    Vê lista do dia com OSs atribuídas
    │    Clica na OS → abre formulário com mapa
    │
    ├── Check-in (valida CPF do cliente)
    ├── Upload fotos "antes"
    ├── Executa serviço
    ├── Upload fotos "depois"
    ├── Coleta assinatura digital
    └── Confirma conclusão → chama complete_service_order()
    ▼
(OS Concluída: completed)
    └── Visível para Admin, Gestor e Cliente
```

### 6.2. Fluxo de Assinatura Recorrente

```
[Admin] ──► Cria assinatura em /private/assinaturas
    │    Seleciona: cliente, parceiro, plano, valor, dia
    │    Insere em subscriptions
    ▼
[Cron Job Diário] ──► /api/cron/subscriptions
    │    Varre subscriptions WHERE status='active' AND next_billing <= hoje+5d
    │    Para cada uma: generate_subscription_os()
    │    Cria OS de campo automaticamente (status: assigned_partner)
    │    Atualiza next_billing para próximo mês
    ▼
[Gestor] ──► Notificado visualmente no painel
    │    Delega para técnico
    ▼
[Técnico] ──► Executa atendimento normalmente
    ▼
[Admin] ──► Registra pagamento manual em /private/assinaturas
```

---

## 7. Interface do Usuário (UI/UX)

### 7.1. Estrutura de Rotas

```
/app
├── (site)
│   ├── page.tsx                          # Landing page (existente)
│   ├── servicos/page.tsx                 # Catálogo de serviços (existente, adicionar badge parceiro)
│   ├── servico/[...slug]/page.tsx        # Detalhe do serviço (existente)
│   ├── checkout/page.tsx                 # Checkout (existente)
│   └── pedido/[id]/page.tsx             # Detalhe do pedido (existente, mostrar status da OS)
│
├── (admin)
│   └── private/
│       ├── layout.tsx                    # Admin layout (existente, adicionar nav items)
│       ├── parceiros/
│       │   ├── page.tsx                  # Lista de parceiros (CRUD)
│       │   └── [id]/page.tsx            # Detalhe do parceiro + técnicos
│       ├── assinaturas/
│       │   └── page.tsx                  # Lista de assinaturas + criar/editar
│       └── pedidos/page.tsx             # (existente, adicionar seletor de parceiro)
│
├── (parceiro)
│   └── parceiro/
│       ├── layout.tsx                    # Layout do parceiro (sidebar + auth guard)
│       ├── login/page.tsx               # Login do parceiro
│       ├── dashboard/page.tsx            # KPIs do parceiro
│       ├── equipe/page.tsx               # CRUD técnicos
│       ├── chamados/page.tsx             # Lista de OSs + delegar
│       └── assinaturas/page.tsx          # Visualizar contratos
│
├── (tecnico)
│   └── parceiro/tecnico/
│       ├── layout.tsx                    # Layout PWA (mobile-first)
│       ├── page.tsx                      # Login do técnico
│       ├── hoje/page.tsx                 # Lista de OSs do dia
│       └── os/[id]/page.tsx             # Formulário de atendimento
│
└── api/
    ├── cron/
    │   └── subscriptions/route.ts        # Gera OSs de assinatura
    └── chat/route.ts                     # (existente)
```

### 7.2. Páginas Novas Detalhadas

#### `/private/parceiros` — Gestão de Parceiros

- **Tabela** com colunas: Nome, CNPJ, Email, Telefone, Status (ativo/inativo), Ações
- **Botão "Novo Parceiro"** → Dialog com form: name, cnpj, email, phone, address
- **Ações por linha:** Editar, Ver detalhes, Ativar/Desativar
- **Busca** por nome ou CNPJ
- **Padrão CRUD** idêntico ao existente em `/private/clientes`

#### `/private/parceiros/[id]` — Detalhe do Parceiro

- **Header:** Nome, CNPJ, Status, Badge com contagem de técnicos
- **Abas:**
  - **Técnicos:** tabela CRUD de técnicos vinculados (nome, email, CPF, status)
  - **OSs:** lista de OSs atribuídas a este parceiro
  - **Assinaturas:** contratos vinculados

#### `/private/assinaturas` — Gestão de Assinaturas

- **Tabela:** Título, Cliente, Parceiro, Valor Mensal, Dia Cobrança, Status, Próxima Visita, Ações
- **Botão "Nova Assinatura"** → Dialog com form:
  - Título/Plano
  - Cliente (select com busca)
  - Empresa Parceira (select)
  - Valor Mensal (number)
  - Dia do Mês (1-28)
  - Data Início
  - Descrição do serviço
- **Ações:** Pausar, Retomar, Cancelar, Registrar Pagamento (botão que atualiza status)

#### `/parceiro/dashboard` — Dashboard do Gestor

- **KPI Cards:** OSs do dia, Técnicos ativos, Assinaturas ativas, OSs concluídas no mês
- **Tabela:** Últimas OSs recebidas com status

#### `/parceiro/equipe` — Gestão de Técnicos

- **Tabela:** Nome, Email, CPF, Status, OSs ativas
- **Botão "Novo Técnico"** → Dialog: selecionar usuário existente (ou criar), informar CPF
- **Ações:** Editar, Ativar/Desativar

#### `/parceiro/chamados` — Atribuição de OSs

- **Filtros:** Status (pendente, atribuído, em andamento), Técnico, Período
- **Tabela:** Data, Cliente, Endereço, Status, Técnico, Ações
- **Ação "Delegar":** Select com técnicos disponíveis da empresa → chama `delegate_service_order()`

#### `/parceiro/tecnico/hoje` — Lista do Dia (PWA)

- **Cards** com info da OS: Horário, Cliente, Endereço, Status
- **Botão "Iniciar"** → abre formulário com mapa
- **GPS:** botão "Como chegar" abre Google Maps com coordenadas
- **Layout:** mobile-first, botões grandes, fundo escuro

#### `/parceiro/tecnico/os/[id]` — Formulário de Atendimento

1. **Mapa** (topo) — rota até o local
2. **Dados do cliente** — nome, CPF, telefone, endereço
3. **Botão "Check-in"** — input CPF do cliente → valida com `client_cpf`
4. **Seção "Fotos Antes"** — upload com câmera ou galeria
5. **Laudo Técnico** — textarea
6. **Seção "Fotos Depois"** — upload com câmera ou galeria
7. **Assinatura Digital** — canvas para desenhar (react-signature-canvas)
8. **Botão "Confirmar Conclusão"** — valida evidências, chama `complete_service_order()`

---

## 8. Alterações no Código Existente

### 8.1. `src/middleware.ts`

Adicionar refresh de sessão para rotas `/parceiro/*`:

```ts
// Adicionar na condição existente
if (
  request.nextUrl.pathname.startsWith("/private") ||
  request.nextUrl.pathname.startsWith("/parceiro")
) {
  await supabase.auth.getUser();
}
```

### 8.2. `src/hooks/useAuth.ts`

Adicionar campos de role ao retorno:

```ts
// Adicionar ao estado
const [userRole, setUserRole] = useState<string | null>(null);
const [partnerId, setPartnerId] = useState<string | null>(null);

// Na verificação de auth, buscar user_roles
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role, partner_id")
  .eq("user_id", session.user.id)
  .in("role", ["admin", "partner_gestor", "partner_tech"])
  .maybeSingle();

// Retornar: { user, isAdmin, userRole, partnerId, loading, signOut }
```

### 8.3. `src/hooks/useServices.ts`

Filtrar serviços por `partner_id` quando necessário:

```ts
// Adicionar filtro opcional
const fetchServices = async (partnerFilter?: string) => {
  let query = supabase.from("services").select("*").eq("active", true);
  if (partnerFilter) query = query.eq("partner_id", partnerFilter);
  // ...
};
```

### 8.4. `app/private/layout.tsx`

Adicionar novos itens de navegação:

```ts
import { Building2, RefreshCw } from "lucide-react";

const adminNavLinks = [
  // ... existentes
  { href: "/private/parceiros", label: "Parceiros", icon: Building2 },
  { href: "/private/assinaturas", label: "Assinaturas", icon: RefreshCw },
];
```

### 8.5. `app/private/pedidos/page.tsx`

Adicionar seletor de parceiro ao criar/editar OS:

- Select com empresas parceiras ativas (fetch de `partners`)
- Ao selecionar parceiro, habilitar botão "Atribuir Parceiro"
- Chamar `create_service_order()` ao atribuir

### 8.6. `components/ServiceCard.tsx`

Adicionar badge "Parceiro" quando `partner_id` não for null:

```tsx
{service.is_partner_service && (
  <span className="absolute top-2 right-2 rounded-full bg-[#8B5CF6]/20 px-2 py-0.5 text-[10px] font-bold text-[#8B5CF6]">
    PARCEIRO
  </span>
)}
```

---

## 9. API Endpoints

### 9.1. Módulo Admin (`/api/admin`)

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/admin/partners` | Lista todos os parceiros |
| `POST` | `/api/admin/partners` | Cadastra parceiro |
| `PUT` | `/api/admin/partners/:id` | Atualiza parceiro |
| `DELETE` | `/api/admin/partners/:id` | Remove parceiro |
| `POST` | `/api/admin/service-orders/assign` | Atribui OS a parceiro |
| `GET` | `/api/admin/subscriptions` | Lista assinaturas |
| `POST` | `/api/admin/subscriptions` | Cria assinatura |
| `PATCH` | `/api/admin/subscriptions/:id/status` | Atualiza status da assinatura |

### 9.2. Módulo Parceiro (`/api/partner`)

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/partner/technicians` | Lista técnicos do parceiro |
| `POST` | `/api/partner/technicians` | Adiciona técnico |
| `PATCH` | `/api/partner/service-orders/:id/delegate` | Delega OS a técnico |
| `GET` | `/api/partner/service-orders` | Lista OSs do parceiro |

### 9.3. Módulo Técnico (`/api/tech`)

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/tech/orders/today` | OSs agendadas para hoje |
| `POST` | `/api/tech/service-orders/:id/checkin` | Check-in com validação CPF |
| `POST` | `/api/tech/service-orders/:id/complete` | Completa com evidências |
| `POST` | `/api/tech/service-orders/:id/photos` | Upload de fotos |

### 9.4. Cron Job

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/cron/subscriptions` | Gera OSs de assinatura (protegido por header) |

---

## 10. Regras de Negócio

### 10.1. Isolamento Multi-Tenant

- Todas as queries de `partner_gestor` e `partner_tech` filtram por `partner_id` via RLS
- Um parceiro **nunca** acessa dados de outro parceiro
- Admin tem acesso global a todas as tabelas

### 10.2. Validação de Check-in

- Botão "Iniciar Serviço" só libera após:
  - CPF digitado pelo cliente confere com `client_cpf` da OS **OU**
  - Geolocalização está dentro de raio configurável do endereço

### 10.3. Obrigatoriedade de Evidências

Transição para `completed` exige **obrigatoriamente**:
- ≥ 1 foto do tipo `before`
- ≥ 1 foto do tipo `after`
- Laudo técnico preenchido (`tech_notes`)
- Assinatura digital do cliente (`client_signature`)

### 10.4. Assinaturas

- OS é gerada automaticamente 5 dias antes do `billing_day`
- Gestor do parceiro recebe a OS com status `assigned_partner`
- Pagamento é registrado **manualmente** pelo admin
- Se pagamento não registrado até 5 dias após `billing_day`, status vira `overdue`

### 10.5. Status da OS

| Status | Quem define | Próximo status possível |
|---|---|---|
| `pending` | Sistema (checkout) | `assigned_partner`, `cancelled` |
| `assigned_partner` | Admin | `assigned_tech`, `cancelled` |
| `assigned_tech` | Gestor | `in_progress`, `cancelled` |
| `in_progress` | Técnico (check-in) | `completed` |
| `completed` | Técnico (com evidências) | — |
| `cancelled` | Admin/Gestor | — |

---

## 11. Cronograma de Implementação

### Fase 1: Schema DB & Migrations (2-3 dias)

- [ ] Criar migration SQL com todas as tabelas novas
- [ ] Criar migration com RLS policies
- [ ] Criar migration com database functions (RPC)
- [ ] Criar migration com alterações em tabelas existentes
- [ ] Criar bucket `service-order-photos` com policies
- [ ] Testar migrations no Supabase Dashboard

### Fase 2: Painel Admin — Parceiros (3-4 dias)

- [ ] Criar hook `useUserRole.ts`
- [ ] Criar página `/private/parceiros` (CRUD)
- [ ] Criar página `/private/parceiros/[id]` (detalhe + técnicos)
- [ ] Criar página `/private/assinaturas` (CRUD)
- [ ] Atualizar `/private/pedidos` com seletor de parceiro
- [ ] Atualizar layout do admin com novos nav items
- [ ] Atualizar `useAuth.ts` com campos de role

### Fase 3: Portal do Gestor Parceiro (3-4 dias)

- [ ] Criar layout `/parceiro/layout.tsx` com auth guard
- [ ] Criar página `/parceiro/login`
- [ ] Criar `/parceiro/dashboard` com KPIs
- [ ] Criar `/parceiro/equipe` (CRUD técnicos)
- [ ] Criar `/parceiro/chamados` (lista + delegação)
- [ ] Criar `/parceiro/assinaturas` (visualização)

### Fase 4: PWA do Técnico (4-5 dias)

- [ ] Criar layout `/parceiro/tecnico/layout.tsx` (mobile-first)
- [ ] Criar página `/parceiro/tecnico` (login)
- [ ] Criar `/parceiro/tecnico/hoje` (lista do dia)
- [ ] Criar `/parceiro/tecnico/os/[id]` (formulário completo)
- [ ] Integrar mapa (Google Maps / OpenStreetMap)
- [ ] Integrar upload de fotos (câmera + galeria)
- [ ] Integrar canvas de assinatura digital
- [ ] Testar em dispositivos móveis reais

### Fase 5: Motor de Assinaturas (1-2 dias)

- [ ] Criar endpoint `/api/cron/subscriptions`
- [ ] Configurar Vercel Cron Job (diário)
- [ ] Testar geração automática de OSs
- [ ] Adicionar proteção de endpoint (header secret)

### Fase 6: Integração e Testes (2-3 dias)

- [ ] Testar fluxo completo: checkout → admin → parceiro → técnico → conclusão
- [ ] Testar isolamento RLS (parceiro A não vê dados do parceiro B)
- [ ] Testar PWA em modo offline
- [ ] Testar geração de OSs de assinatura
- [ ] Ajustes de UX baseados em testes

**Total estimado:** 15-21 dias de desenvolvimento

---

## 12. Dependências Necessárias

| Pacote | Uso | Já instalado? |
|---|---|---|
| `react-signature-canvas` | Assinatura digital do cliente | ❌ Instalar |
| `@react-google-maps/api` ou Leaflet | Mapa no formulário do técnico | ❌ Instalar |
| `next-pwa` | PWA (já configurado) | ✅ Sim |

---

## 13. Segurança

- **RLS obrigatório** em todas as tabelas — nenhum acesso sem filtro por `partner_id`
- **Funções RPC com `SECURITY DEFINER`** — executam com privilégios do owner, garantindo que o RLS não seja bypassado indevidamente
- **Endpoint de cron** protegido por header `Authorization` secreto
- **Upload de fotos** em bucket privado com policy restrita
- **CPF validado** no check-in para confirmar presença do cliente
- **Sem exposição de secrets** em código cliente
- **Middleware** extensível para proteger rotas `/parceiro/*`

---

*Documento gerado em 01/09/2026 — AR Consertos*
