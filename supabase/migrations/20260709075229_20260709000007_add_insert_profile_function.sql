-- Debug: Add a policy to allow service_role to manage profiles
-- This helps with debugging and admin operations

-- Also add a helper function to insert profile that bypasses RLS
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_profile(uuid, text, text, date, text, jsonb) TO authenticated;