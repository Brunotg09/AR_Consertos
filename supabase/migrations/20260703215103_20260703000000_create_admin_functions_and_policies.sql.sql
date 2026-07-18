/*
# Funções e políticas para área administrativa

1. Função RPC para verificar se usuário é admin
- `is_admin()`: retorna true se o usuário logado está na tabela user_private

2. Políticas RLS para admins
- Admins (usuários em user_private) têm acesso completo a todas as tabelas
- Mantém acesso owner-scoped para usuários normais

3. Storage bucket para produtos
- `products`: bucket para imagens de produtos
*/

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_private WHERE id = auth.uid()
  );
$$;

-- Função para obter todos os pedidos com itens (admin)
CREATE OR REPLACE FUNCTION get_all_orders_with_items()
RETURNS TABLE (
  order_id uuid,
  order_cliente_id int,
  order_user_id uuid,
  order_status text,
  order_payment_method text,
  order_total decimal(10,2),
  order_notes text,
  order_created_at timestamptz,
  order_updated_at timestamptz,
  item_id int,
  item_type text,
  item_name text,
  item_service_type text,
  item_quantity int,
  item_price decimal(10,2),
  item_payment_status text,
  item_amount_paid decimal(10,2),
  item_scheduled_date timestamptz,
  item_problem_description text,
  item_diagnosis text,
  item_completed_at timestamptz,
  item_warranty_expires_at timestamptz,
  item_product_category text,
  item_product_condition text,
  item_product_images text[]
) LANGUAGE sql SECURITY DEFINER AS $$
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
$$;

-- Políticas para produtos (escrita apenas admin)
DROP POLICY IF EXISTS "Leitura pública de produtos" ON products;
CREATE POLICY "Leitura de produtos ativos" ON products FOR SELECT
  TO anon, authenticated USING (active = true OR is_admin());

CREATE POLICY "Admin insert produtos" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin update produtos" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin delete produtos" ON products FOR DELETE
  TO authenticated USING (is_admin());

-- Políticas para orders (admin vê tudo)
DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_orders_admin_or_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_orders_admin_or_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_orders_admin_or_own" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_orders_admin_or_own" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- Políticas para order_items (admin vê tudo)
DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_order_items_admin_or_own" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
CREATE POLICY "insert_order_items_admin_or_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "update_own_order_items" ON order_items;
CREATE POLICY "update_order_items_admin_or_own" ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "delete_own_order_items" ON order_items;
CREATE POLICY "delete_order_items_admin_or_own" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
  );

-- Políticas para clientes (admin vê tudo)
DROP POLICY IF EXISTS "select_linked_clientes" ON clientes;
CREATE POLICY "select_clientes_admin_or_own" ON clientes FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_linked_clientes" ON clientes;
CREATE POLICY "insert_clientes_admin_or_own" ON clientes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "update_linked_clientes" ON clientes;
CREATE POLICY "update_clientes_admin_or_own" ON clientes FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "delete_linked_clientes" ON clientes;
CREATE POLICY "delete_clientes_admin_or_own" ON clientes FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR is_admin());

-- Storage bucket para produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para produtos
CREATE POLICY "Product select public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'products');

CREATE POLICY "Product insert admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products' AND is_admin());

CREATE POLICY "Product update admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND is_admin())
WITH CHECK (bucket_id = 'products' AND is_admin());

CREATE POLICY "Product delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND is_admin());

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_with_items() TO authenticated;
