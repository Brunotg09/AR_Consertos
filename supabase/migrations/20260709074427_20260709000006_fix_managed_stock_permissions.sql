-- Fix managed stock functions - revoke from anon/PUBLIC
-- Only authenticated users should be able to call these
REVOKE EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.managed_decrement_stock(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.managed_increment_stock(integer, integer) FROM PUBLIC;

-- The functions already have admin checks inside, so authenticated is fine