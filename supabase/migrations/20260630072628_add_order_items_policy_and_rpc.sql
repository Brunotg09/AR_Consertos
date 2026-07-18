/*
# Melhorias para histórico de pedidos

1. Adiciona função RPC para buscar pedidos com itens do usuário logado
2. Adiciona índice em order_items.order_id para performance
3. Adiciona política de leitura pública para order_items (via join com orders)
*/

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Função RPC para buscar pedidos com itens do usuário logado
CREATE OR REPLACE FUNCTION get_user_orders_with_items()
RETURNS TABLE (
  order_id uuid,
  order_status text,
  order_payment_method text,
  order_total decimal(10,2),
  order_created_at timestamptz,
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
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_orders_with_items() TO authenticated;
