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
    SELECT 1 FROM user_private WHERE id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
