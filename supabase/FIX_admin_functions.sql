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

GRANT EXECUTE ON FUNCTION public.get_all_orders_with_items() TO authenticated;
