-- Fix RLS policies for profiles, user_private, clientes
-- Allows authenticated users to SELECT all (needed for admin features like Novo Pedido, Vincular Conta)

-- profiles
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "select_all_profiles" ON public.profiles;

CREATE POLICY "select_all_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- user_private
DROP POLICY IF EXISTS "select_own_user_private" ON public.user_private;
DROP POLICY IF EXISTS "insert_own_user_private" ON public.user_private;
DROP POLICY IF EXISTS "update_own_user_private" ON public.user_private;
DROP POLICY IF EXISTS "delete_own_user_private" ON public.user_private;
DROP POLICY IF EXISTS "select_all_user_private" ON public.user_private;

CREATE POLICY "select_all_user_private" ON public.user_private FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_user_private" ON public.user_private FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_user_private" ON public.user_private FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "delete_own_user_private" ON public.user_private FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- clientes
DROP POLICY IF EXISTS "select_linked_clientes" ON public.clientes;
DROP POLICY IF EXISTS "insert_linked_clientes" ON public.clientes;
DROP POLICY IF EXISTS "update_linked_clientes" ON public.clientes;
DROP POLICY IF EXISTS "delete_linked_clientes" ON public.clientes;
DROP POLICY IF EXISTS "select_all_clientes" ON public.clientes;

CREATE POLICY "select_all_clientes" ON public.clientes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_linked_clientes" ON public.clientes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_linked_clientes" ON public.clientes FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_linked_clientes" ON public.clientes FOR DELETE
  TO authenticated USING (user_id = auth.uid());