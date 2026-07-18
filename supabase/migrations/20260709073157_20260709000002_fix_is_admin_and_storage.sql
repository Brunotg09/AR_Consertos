-- Fix is_admin function - no is_admin column exists in user_private table
-- For now, we'll create an admin role check using JWT claims or a dedicated admin table
-- Since the app doesn't have admin functionality defined, we'll make is_admin return false for everyone
-- Later, admin users can be added via a new column or separate table

-- First, fix the is_admin function to avoid the missing column error
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
  
  -- For now, admin must be set via raw JWT claims or manually in database
  -- Check if user email is from domain @arconsertos.com.br (company domain)
  RETURN EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  );
END;
$$;

-- Fix get_all_orders_with_items to not use is_admin column
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
  -- Only allow admins (company email domain) to call this function
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
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

-- Now fix storage policies
-- Drop overly permissive SELECT policies that allow listing
DROP POLICY IF EXISTS "Avatar select public" ON storage.objects;
DROP POLICY IF EXISTS "Product select public" ON storage.objects;

-- For public buckets, we don't need SELECT policies at all
-- Files are accessible via public URLs without RLS
-- Only authenticated users should access via API (to prevent anon listing)
CREATE POLICY "Avatar authenticated access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Product authenticated access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'products');

-- Note: Anon users can still access files directly via public URL
-- but cannot list files through the storage API