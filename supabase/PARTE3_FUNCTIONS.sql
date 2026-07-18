-- ============================================================
-- PARTE 3: FUNCTIONS (execute apos Parte 2)
-- ============================================================

-- is_admin
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
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  );
END;
$$;

-- insert_profile
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

-- link_cliente_on_signup (trigger function)
CREATE OR REPLACE FUNCTION public.link_cliente_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE clientes
  SET user_id = NEW.id
  WHERE (
    (LOWER(nome) = LOWER(NEW.full_name))
    OR (telefone IS NOT NULL AND telefone = NEW.phone)
    OR (email IS NOT NULL AND LOWER(email) = LOWER(NEW.email))
  )
  AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- estornar_estoque_cancelamento (trigger function)
CREATE OR REPLACE FUNCTION public.estornar_estoque_cancelamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

-- update_session_timestamp (trigger function)
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- stock functions
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

CREATE OR REPLACE FUNCTION public.managed_decrement_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  UPDATE products SET stock = stock - qty WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.managed_increment_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  UPDATE products SET stock = stock + qty WHERE id = product_id;
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
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
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

-- Grants
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_orders_with_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orders_with_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_profile(uuid, text, text, date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_session_timeout() TO service_role;
