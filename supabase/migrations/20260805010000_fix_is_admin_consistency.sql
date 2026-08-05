-- ============================================================
-- Migration: Fix is_admin() inconsistency causing 404 on writes
--
-- The migration 20260709073157 added `email LIKE '%@arconsertos.com.br'`
-- to is_admin(), but /private/layout.tsx checks admin access solely by
-- user existence in user_private (no email check). This mismatch allows
-- users to enter the admin panel but blocks all write operations (RLS
-- returns 404 for anon-invisible resources).
--
-- This migration restores is_admin() to check only user_private existence,
-- keeping it consistent with the admin layout access check.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Restore managed stock functions to use user_private check (consistent with is_admin)
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

GRANT EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) TO authenticated;

-- ============================================================
-- Fix services policy: replace email LIKE check with is_admin()
-- The "Admin manage services" policy (from migration
-- 20260718120000_create_services_table.sql) used a direct
-- email check that is inconsistent with the admin layout's
-- access check and the rest of the codebase.
-- ============================================================
DROP POLICY IF EXISTS "Admin manage services" ON services;
CREATE POLICY "Admin manage services" ON services FOR ALL
  TO authenticated USING (is_admin())
  WITH CHECK (is_admin());
