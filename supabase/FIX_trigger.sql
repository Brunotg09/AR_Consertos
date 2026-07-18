CREATE OR REPLACE FUNCTION public.link_cliente_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
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

DROP TRIGGER IF EXISTS on_signup_link_cliente ON profiles;
CREATE TRIGGER on_signup_link_cliente
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_cliente_on_signup();
