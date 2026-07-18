/*
# Cria tabelas de produtos, pedidos e itens de pedido + trigger de estoque

1. Novas Tabelas
- `products`: catálogo de produtos da loja
  - `id` (serial, PK)
  - `name` (text, NOT NULL)
  - `category` (text)
  - `description` (text)
  - `price` (decimal(10,2), NOT NULL)
  - `stock` (int, DEFAULT 0)
  - `condition` (text, CHECK: novo/usado/recondicionado)
  - `images` (text[])
  - `active` (boolean, DEFAULT true)
  - `created_at` (timestamptz, DEFAULT now())

- `orders`: pedidos de clientes
  - `id` (uuid, PK, DEFAULT gen_random_uuid())
  - `cliente_id` (int, FK para clientes, ON DELETE SET NULL)
  - `user_id` (uuid, FK para profiles, ON DELETE SET NULL)
  - `status` (text, DEFAULT 'pendente', CHECK: pendente/confirmado/em_andamento/concluido/cancelado)
  - `payment_method` (text, CHECK: dinheiro/pix/cartao)
  - `payment_confirmed` (boolean, DEFAULT false)
  - `total` (decimal(10,2), NOT NULL)
  - `notes` (text)
  - `created_at` (timestamptz, DEFAULT now())
  - `updated_at` (timestamptz, DEFAULT now())

- `order_items`: itens de cada pedido (produtos ou serviços)
  - `id` (serial, PK)
  - `order_id` (uuid, FK para orders, ON DELETE CASCADE)
  - `item_type` (text, NOT NULL, CHECK: servico/produto)
  - `item_id` (text, NOT NULL)
  - `item_name` (text, NOT NULL)
  - `service_type` (text, CHECK: convencional/inverter)
  - `quantity` (int, DEFAULT 1)
  - `price` (decimal(10,2))
  - `payment_method` (text, CHECK: dinheiro/pix/cartao)
  - `payment_status` (text, DEFAULT 'pendente', CHECK: pendente/pago_parcial/pago/cancelado)
  - `payments` (jsonb, DEFAULT '[]')
  - `amount_paid` (decimal(10,2), DEFAULT 0)
  - `scheduled_date` (timestamptz)
  - `problem_description` (text)
  - `diagnosis` (text)
  - `completed_at` (timestamptz)
  - `warranty_expires_at` (timestamptz)
  - `product_category` (text)
  - `product_condition` (text, CHECK: novo/usado/recondicionado)
  - `product_images` (text[])

2. Trigger
- `estornar_estoque_cancelamento`: ao cancelar ou deletar um item de produto,
  estorna automaticamente a quantidade no estoque da tabela products.

3. Segurança
- RLS em products: leitura pública para produtos ativos.
- RLS em orders e order_items: owner-scoped para usuários autenticados.
*/

-- products
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

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de produtos" ON products;
CREATE POLICY "Leitura pública de produtos" ON products FOR SELECT
  TO anon, authenticated USING (active = true);

-- orders
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

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- order_items
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

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
CREATE POLICY "insert_own_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_order_items" ON order_items;
CREATE POLICY "update_own_order_items" ON order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_order_items" ON order_items;
CREATE POLICY "delete_own_order_items" ON order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- Trigger: estorna estoque ao cancelar/deletar item de produto
CREATE OR REPLACE FUNCTION estornar_estoque_cancelamento()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.payment_status = 'cancelado' AND OLD.payment_status != 'cancelado') OR (TG_OP = 'DELETE') THEN
    IF OLD.item_type = 'produto' THEN
      UPDATE products SET stock = stock + OLD.quantity WHERE id = CAST(OLD.item_id AS integer);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_cancel_or_delete_item ON order_items;
CREATE TRIGGER on_cancel_or_delete_item
  AFTER UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION estornar_estoque_cancelamento();
