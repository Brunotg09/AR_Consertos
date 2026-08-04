-- Fix get_user_orders_with_items to also find orders via cliente_id
DROP FUNCTION IF EXISTS public.get_user_orders_with_items();

CREATE OR REPLACE FUNCTION public.get_user_orders_with_items()
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
  item_status text,
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
    oi.status AS item_status,
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
     OR o.cliente_id IN (
       SELECT c.id FROM clientes c WHERE c.user_id = auth.uid()
     )
  ORDER BY o.created_at DESC, oi.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_orders_with_items() TO authenticated;

-- Backfill user_id on orders that have a linked client but no user_id
UPDATE orders o
SET user_id = c.user_id
FROM clientes c
WHERE o.cliente_id = c.id
  AND o.user_id IS NULL
  AND c.user_id IS NOT NULL;
