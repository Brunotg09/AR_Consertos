-- Revoke EXECUTE from PUBLIC role (which includes anon and authenticated)
-- These functions should only be callable by authenticated users

REVOKE EXECUTE ON FUNCTION public.check_session_timeout() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_stock(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_orders_with_items() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_orders_with_items() FROM PUBLIC;

-- Grant EXECUTE back to authenticated only
GRANT EXECUTE ON FUNCTION public.check_session_timeout() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_stock(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_orders_with_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_orders_with_items() TO authenticated;

-- is_admin can stay public since it returns false for non-authenticated users
-- and we've fixed the is_admin column issue