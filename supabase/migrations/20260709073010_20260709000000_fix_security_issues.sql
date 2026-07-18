-- Fix Function Search Path Mutability
-- All functions need SET search_path = '' to prevent search_path attacks

-- Drop existing functions that have return type changes
DROP FUNCTION IF EXISTS public.get_user_orders_with_items();
DROP FUNCTION IF EXISTS public.get_all_orders_with_items();

-- 1. Fix trigger functions
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

-- 2. Fix SECURITY DEFINER functions with search_path
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

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_all_orders_with_items()
RETURNS TABLE (
  order_id uuid,
  order_cliente_id uuid,
  order_user_id uuid,
  order_status text,
  order_payment_method text,
  order_total numeric,
  order_notes text,
  order_created_at timestamptz,
  order_updated_at timestamptz,
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
  -- Only allow admins to call this function
  IF NOT EXISTS (SELECT 1 FROM user_private WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar esta função.';
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Return false if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_private WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- 3. Revoke EXECUTE permissions from anon for sensitive functions
-- Only authenticated users should call most of these
REVOKE EXECUTE ON FUNCTION public.check_session_timeout() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_stock(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_orders_with_items() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_orders_with_items() FROM anon;

-- is_admin can remain callable by anon (returns false if not authenticated)
-- Keep EXECUTE on is_admin since we added auth.uid() check

-- 4. Fix storage bucket policies - these policies still allow listing but
-- we need public access for images to work in the frontend
-- The original policies use USING (bucket_id = 'avatars') which is correct
-- The warning is about allowing listing - but we need this for the app to work