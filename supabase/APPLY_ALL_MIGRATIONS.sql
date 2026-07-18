-- MIGRACAO COMPLETA - AR Consertos (ATUALIZADA)
-- Cole este SQL no Supabase SQL Editor e execute

-- ============================================================
-- 1. TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  birth_date date,
  avatar_url text,
  address jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_private (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clientes (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  email text,
  cpf text,
  endereco jsonb,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text,
  description text,
  price decimal(10,2) NOT NULL,
  stock int DEFAULT 0,
  condition text CHECK (condition IN ('novo', 'usado', 'recondicionado')),
  images text[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id int REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado')),
  payment_method text CHECK (payment_method IN ('dinheiro', 'pix', 'cartao')),
  payment_confirmed boolean DEFAULT false,
  total decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('servico', 'produto')),
  item_id text NOT NULL,
  item_name text NOT NULL,
  service_type text CHECK (service_type IN ('convencional', 'inverter')),
  quantity int DEFAULT 1,
  price decimal(10,2),
  payment_method text CHECK (payment_method IN ('dinheiro', 'pix', 'cartao')),
  payment_status text DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago_parcial', 'pago', 'cancelado')),
  payments jsonb DEFAULT '[]',
  amount_paid decimal(10,2) DEFAULT 0,
  scheduled_date timestamptz,
  problem_description text,
  diagnosis text,
  completed_at timestamptz,
  warranty_expires_at timestamptz,
  product_category text,
  product_condition text CHECK (product_condition IN ('novo', 'usado', 'recondicionado')),
  product_images text[]
);

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

CREATE TABLE IF NOT EXISTS hidden_services (
  id serial PRIMARY KEY,
  service_id text NOT NULL UNIQUE,
  hidden_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'bot' CHECK (status IN ('bot', 'aguardando_admin', 'com_admin', 'encerrado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'bot', 'admin')),
  content text NOT NULL,
  read_by_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- user_private
DROP POLICY IF EXISTS "select_own_user_private" ON user_private;
CREATE POLICY "select_own_user_private" ON user_private FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_user_private" ON user_private;
CREATE POLICY "insert_own_user_private" ON user_private FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_user_private" ON user_private;
CREATE POLICY "update_own_user_private" ON user_private FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- clientes
DROP POLICY IF EXISTS "select_clientes_admin_or_own" ON clientes;
CREATE POLICY "select_clientes_admin_or_own" ON clientes FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_clientes_admin_or_own" ON clientes;
CREATE POLICY "insert_clientes_admin_or_own" ON clientes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "update_clientes_admin_or_own" ON clientes;
CREATE POLICY "update_clientes_admin_or_own" ON clientes FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "delete_clientes_admin_or_own" ON clientes;
CREATE POLICY "delete_clientes_admin_or_own" ON clientes FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR is_admin());

-- products
DROP POLICY IF EXISTS "Leitura publica de produtos" ON products;
DROP POLICY IF EXISTS "Leitura de produtos ativos" ON products;
CREATE POLICY "Leitura de produtos ativos" ON products FOR SELECT
  TO anon, authenticated USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admin insert produtos" ON products;
CREATE POLICY "Admin insert produtos" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin update produtos" ON products;
CREATE POLICY "Admin update produtos" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin delete produtos" ON products;
CREATE POLICY "Admin delete produtos" ON products FOR DELETE
  TO authenticated USING (is_admin());

-- orders
DROP POLICY IF EXISTS "select_own_orders" ON orders;
DROP POLICY IF EXISTS "select_orders_admin_or_own" ON orders;
CREATE POLICY "select_orders_admin_or_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_orders_admin_or_own" ON orders;
CREATE POLICY "insert_orders_admin_or_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "update_own_orders" ON orders;
DROP POLICY IF EXISTS "update_orders_admin_or_own" ON orders;
CREATE POLICY "update_orders_admin_or_own" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
DROP POLICY IF EXISTS "delete_orders_admin_or_own" ON orders;
CREATE POLICY "delete_orders_admin_or_own" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- order_items
DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
DROP POLICY IF EXISTS "select_order_items_admin_or_own" ON order_items;
CREATE POLICY "select_order_items_admin_or_own" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
DROP POLICY IF EXISTS "insert_order_items_admin_or_own" ON order_items;
CREATE POLICY "insert_order_items_admin_or_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "update_own_order_items" ON order_items;
DROP POLICY IF EXISTS "update_order_items_admin_or_own" ON order_items;
CREATE POLICY "update_order_items_admin_or_own" ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "delete_own_order_items" ON order_items;
DROP POLICY IF EXISTS "delete_order_items_admin_or_own" ON order_items;
CREATE POLICY "delete_order_items_admin_or_own" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

-- banners
DROP POLICY IF EXISTS "Leitura publica de banners" ON banners;
CREATE POLICY "Leitura publica de banners" ON banners FOR SELECT
  TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "Escrita de banners restrita para admins" ON banners;
CREATE POLICY "Escrita de banners restrita para admins" ON banners
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- hidden_services
DROP POLICY IF EXISTS "Admin acesso a hidden_services" ON hidden_services;
CREATE POLICY "Admin acesso a hidden_services" ON hidden_services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- chat_sessions
DROP POLICY IF EXISTS "user_select_own_session" ON chat_sessions;
CREATE POLICY "user_select_own_session" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_session" ON chat_sessions;
CREATE POLICY "user_insert_own_session" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_own_session" ON chat_sessions;
CREATE POLICY "user_update_own_session" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_sessions_all" ON chat_sessions;
CREATE POLICY "admin_sessions_all" ON chat_sessions FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()));

-- chat_messages
DROP POLICY IF EXISTS "user_select_own_messages" ON chat_messages;
CREATE POLICY "user_select_own_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_insert_own_messages" ON chat_messages;
CREATE POLICY "user_insert_own_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_messages_all" ON chat_messages;
CREATE POLICY "admin_messages_all" ON chat_messages FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()));

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- is_admin: qualquer usuario em user_private e admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM user_private WHERE id = auth.uid()
  );
END;
$$;

-- link_cliente_on_signup: search_path = public, sem NEW.email
CREATE OR REPLACE FUNCTION public.link_cliente_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE clientes
  SET user_id = NEW.id
  WHERE (
    (LOWER(nome) = LOWER(NEW.full_name))
    OR (telefone IS NOT NULL AND telefone = NEW.phone)
  )
  AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- estornar_estoque_cancelamento
CREATE OR REPLACE FUNCTION public.estornar_estoque_cancelamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.payment_status = 'cancelado' AND OLD.payment_status != 'cancelado') OR (TG_OP = 'DELETE') THEN
    IF OLD.item_type = 'produto' THEN
      UPDATE products SET stock = stock + OLD.quantity WHERE id = CAST(OLD.item_id AS integer);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- update_session_timestamp
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- check_session_timeout
CREATE OR REPLACE FUNCTION public.check_session_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE chat_sessions
  SET status = 'bot', updated_at = now()
  WHERE status = 'aguardando_admin'
  AND updated_at < now() - interval '5 minutes';
END;
$$;

-- delete_user_account
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- insert_profile (bypass RLS)
CREATE OR REPLACE FUNCTION public.insert_profile(
  p_id uuid,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_address jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, birth_date, avatar_url, address)
  VALUES (p_id, p_full_name, p_phone, p_birth_date, p_avatar_url, p_address);
END;
$$;

-- get_user_orders_with_items
DROP FUNCTION IF EXISTS public.get_user_orders_with_items();
CREATE OR REPLACE FUNCTION public.get_user_orders_with_items()
RETURNS TABLE (
  order_id uuid,
  order_status text,
  order_payment_method text,
  order_total numeric,
  order_created_at timestamptz,
  item_id uuid,
  item_type text,
  item_name text,
  item_service_type text,
  item_quantity integer,
  item_price integer,
  item_payment_status text,
  item_amount_paid integer,
  item_scheduled_date date,
  item_problem_description text,
  item_diagnosis text,
  item_completed_at timestamptz,
  item_warranty_expires_at date,
  item_product_category text,
  item_product_condition text,
  item_product_images text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.status AS order_status,
    o.payment_method AS order_payment_method,
    o.total AS order_total,
    o.created_at AS order_created_at,
    oi.id AS item_id,
    oi.item_type,
    oi.item_name,
    oi.service_type AS item_service_type,
    oi.quantity AS item_quantity,
    oi.price AS item_price,
    oi.payment_status AS item_payment_status,
    oi.amount_paid AS item_amount_paid,
    oi.scheduled_date AS item_scheduled_date,
    oi.problem_description AS item_problem_description,
    oi.diagnosis AS item_diagnosis,
    oi.completed_at AS item_completed_at,
    oi.warranty_expires_at AS item_warranty_expires_at,
    oi.product_category AS item_product_category,
    oi.product_condition AS item_product_condition,
    oi.product_images AS item_product_images
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC, oi.id ASC;
END;
$$;

-- get_all_orders_with_items (admin only)
DROP FUNCTION IF EXISTS public.get_all_orders_with_items();
CREATE OR REPLACE FUNCTION public.get_all_orders_with_items()
RETURNS TABLE (
  order_id uuid,
  order_cliente_id int,
  order_user_id uuid,
  order_status text,
  order_payment_method text,
  order_total numeric,
  order_notes text,
  order_created_at timestamptz,
  order_updated_at timestamptz,
  item_id int,
  item_type text,
  item_name text,
  item_service_type text,
  item_quantity integer,
  item_price integer,
  item_payment_status text,
  item_amount_paid integer,
  item_scheduled_date date,
  item_problem_description text,
  item_diagnosis text,
  item_completed_at timestamptz,
  item_warranty_expires_at date,
  item_product_category text,
  item_product_condition text,
  item_product_images text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.cliente_id AS order_cliente_id,
    o.user_id AS order_user_id,
    o.status AS order_status,
    o.payment_method AS order_payment_method,
    o.total AS order_total,
    o.notes AS order_notes,
    o.created_at AS order_created_at,
    o.updated_at AS order_updated_at,
    oi.id AS item_id,
    oi.item_type,
    oi.item_name,
    oi.service_type AS item_service_type,
    oi.quantity AS item_quantity,
    oi.price AS item_price,
    oi.payment_status AS item_payment_status,
    oi.amount_paid AS item_amount_paid,
    oi.scheduled_date AS item_scheduled_date,
    oi.problem_description AS item_problem_description,
    oi.diagnosis AS item_diagnosis,
    oi.completed_at AS item_completed_at,
    oi.warranty_expires_at AS item_warranty_expires_at,
    oi.product_category AS item_product_category,
    oi.product_condition AS item_product_condition,
    oi.product_images AS item_product_images
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  ORDER BY o.created_at DESC, oi.id ASC;
END;
$$;

-- Stock functions
CREATE OR REPLACE FUNCTION public.decrement_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE products SET stock = stock - qty WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE products SET stock = stock + qty WHERE id = product_id;
END;
$$;

-- managed stock (admin only)
CREATE OR REPLACE FUNCTION public.managed_decrement_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  UPDATE products SET stock = stock - qty WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.managed_increment_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  UPDATE products SET stock = stock + qty WHERE id = product_id;
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_signup_link_cliente ON profiles;
CREATE TRIGGER on_signup_link_cliente
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_cliente_on_signup();

DROP TRIGGER IF EXISTS on_cancel_or_delete_item ON order_items;
CREATE TRIGGER on_cancel_or_delete_item
  AFTER UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION estornar_estoque_cancelamento();

DROP TRIGGER IF EXISTS on_message_update_session ON chat_messages;
CREATE TRIGGER on_message_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- ============================================================
-- 6. STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars
DROP POLICY IF EXISTS "Avatar select public" ON storage.objects;
DROP POLICY IF EXISTS "Avatar authenticated access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar insert own" ON storage.objects;
CREATE POLICY "Avatar insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Products
DROP POLICY IF EXISTS "Product select public" ON storage.objects;
DROP POLICY IF EXISTS "Product authenticated access" ON storage.objects;
DROP POLICY IF EXISTS "Product public read" ON storage.objects;
CREATE POLICY "Product public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Product insert admin" ON storage.objects;
CREATE POLICY "Product insert admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products' AND is_admin());

DROP POLICY IF EXISTS "Product update admin" ON storage.objects;
CREATE POLICY "Product update admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND is_admin())
WITH CHECK (bucket_id = 'products' AND is_admin());

DROP POLICY IF EXISTS "Product delete admin" ON storage.objects;
CREATE POLICY "Product delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND is_admin());

-- ============================================================
-- 7. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_orders_with_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orders_with_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_profile(uuid, text, text, date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_session_timeout() TO service_role;
