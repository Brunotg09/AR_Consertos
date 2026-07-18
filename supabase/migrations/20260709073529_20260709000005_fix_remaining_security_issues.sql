-- Fix remaining security issues

-- 1. Remove duplicate storage SELECT policies and keep only public access
DROP POLICY IF EXISTS "Avatar authenticated access" ON storage.objects;
DROP POLICY IF EXISTS "Product authenticated access" ON storage.objects;
-- Keep the public read policies

-- 2. Fix is_admin - revoke from anon since it's not needed by anon users
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

-- 3. Stock functions should only be callable by admins (service role or admin user)
-- These modify stock and should be restricted
REVOKE EXECUTE ON FUNCTION public.decrement_stock(integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_stock(integer, integer) FROM authenticated;

-- Create a wrapper function that checks for admin privileges
-- This will be used instead of direct stock functions
CREATE OR REPLACE FUNCTION public.managed_decrement_stock(product_id integer, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin (has @arconsertos.com.br email)
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem modificar estoque.';
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
  -- Check if user is admin (has @arconsertos.com.br email)
  IF NOT EXISTS (
    SELECT 1 FROM user_private 
    WHERE id = auth.uid() 
    AND email LIKE '%@arconsertos.com.br'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem modificar estoque.';
  END IF;
  
  UPDATE products SET stock = stock + qty WHERE id = product_id;
END;
$$;

-- Grant execute on managed functions to authenticated
GRANT EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) TO authenticated;

-- 4. check_session_timeout should be internal only - revoke from authenticated
-- This is called by the system, not by users
REVOKE EXECUTE ON FUNCTION public.check_session_timeout() FROM authenticated;
-- Grant to service_role for backend calls
GRANT EXECUTE ON FUNCTION public.check_session_timeout() TO service_role;

-- 5. delete_user_account is fine - it checks auth.uid() internally
-- But let's add extra logging and make sure only the user can delete their own account
-- It already has the check, so it's safe but we should confirm

-- 6. For get_user_orders_with_items - it's already restricted by auth.uid()
-- This is safe since users can only see their own orders

-- 7. For get_all_orders_with_items - already has admin check inside
-- But we should also restrict EXECUTE to authenticated only (already done)