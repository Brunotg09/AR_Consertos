-- Policy para permitir leitura de todos os profiles (para admin/staff ver usuários não vinculados)
-- O trigger roda com SECURITY DEFINER, então consegue inserir
-- Mas o SELECT precisa de policy adequada

-- Adicionar policy para leitura de todos os profiles (para usuários autenticados)
-- Se você tem role de admin, pode restringir mais. Por enquanto permite autenticado ver todos.
DROP POLICY IF EXISTS "select_all_profiles" ON public.profiles;
CREATE POLICY "select_all_profiles" ON public.profiles FOR SELECT
  TO authenticated USING (true);

-- Mesma coisa para user_private (para buscar emails)
DROP POLICY IF EXISTS "select_all_user_private" ON public.user_private;
CREATE POLICY "select_all_user_private" ON public.user_private FOR SELECT
  TO authenticated USING (true);

-- Policy para clientes: admin/staff vê todos (não só os seus)
-- Ajuste conforme sua regra de acesso
DROP POLICY IF EXISTS "select_all_clientes" ON public.clientes;
CREATE POLICY "select_all_clientes" ON public.clientes FOR SELECT
  TO authenticated USING (true);