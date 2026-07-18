/*
# Cria tabelas de perfil, dados privados e clientes + trigger de vinculação

1. Novas Tabelas
- `profiles`: perfil público do usuário autenticado
  - `id` (uuid, PK, FK para auth.users)
  - `full_name` (text, NOT NULL)
  - `phone` (text)
  - `birth_date` (date)
  - `avatar_url` (text)
  - `address` (jsonb)
  - `created_at` (timestamptz, DEFAULT now())
- `user_private`: dados privados do usuário (e-mail)
  - `id` (uuid, PK, FK para auth.users)
  - `email` (text, NOT NULL)
  - `created_at` (timestamptz, DEFAULT now())
- `clientes`: cadastro de clientes da oficina
  - `id` (serial, PK)
  - `nome` (text, NOT NULL)
  - `telefone` (text)
  - `email` (text)
  - `cpf` (text)
  - `endereco` (jsonb)
  - `user_id` (uuid, FK para profiles, ON DELETE SET NULL)
  - `notes` (text)
  - `created_at` (timestamptz, DEFAULT now())

2. Segurança
- RLS habilitado em profiles, user_private e clientes.
- Políticas owner-scoped em profiles (usuário vê/altera apenas seu próprio perfil).
- Políticas owner-scoped em user_private.
- Políticas em clientes: usuário autenticado vê apenas clientes vinculados a ele.

3. Trigger
- `link_cliente_on_signup`: ao criar um perfil, tenta vincular automaticamente
  a um registro em `clientes` que tenha nome, telefone ou e-mail coincidente
  e ainda não esteja vinculado a nenhum usuário.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  birth_date date,
  avatar_url text,
  address jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- user_private
CREATE TABLE IF NOT EXISTS user_private (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_private" ON user_private;
CREATE POLICY "select_own_user_private" ON user_private FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_user_private" ON user_private;
CREATE POLICY "insert_own_user_private" ON user_private FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_user_private" ON user_private;
CREATE POLICY "update_own_user_private" ON user_private FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- clientes
CREATE TABLE IF NOT EXISTS clientes (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  email text,
  cpf text,
  endereco jsonb,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_linked_clientes" ON clientes;
CREATE POLICY "select_linked_clientes" ON clientes FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_linked_clientes" ON clientes;
CREATE POLICY "insert_linked_clientes" ON clientes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_linked_clientes" ON clientes;
CREATE POLICY "update_linked_clientes" ON clientes FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_linked_clientes" ON clientes;
CREATE POLICY "delete_linked_clientes" ON clientes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Trigger: vincula cliente ao signup
CREATE OR REPLACE FUNCTION link_cliente_on_signup()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_signup_link_cliente ON profiles;
CREATE TRIGGER on_signup_link_cliente
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_cliente_on_signup();
