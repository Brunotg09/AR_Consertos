-- ============================================================
-- PARTE 4: TRIGGERS + STORAGE (execute apos Parte 3)
-- ============================================================

-- Triggers
DROP TRIGGER IF EXISTS on_signup_link_cliente ON profiles;
CREATE TRIGGER on_signup_link_cliente
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_cliente_on_signup();

DROP TRIGGER IF EXISTS on_cancel_or_delete_item ON order_items;
CREATE TRIGGER on_cancel_or_delete_item
  AFTER UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION estornar_estoque_cancelamento();

DROP TRIGGER IF EXISTS on_message_update_session ON chat_messages;
CREATE TRIGGER on_message_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar insert own" ON storage.objects;
CREATE POLICY "Avatar insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Product public read" ON storage.objects;
CREATE POLICY "Product public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Product insert admin" ON storage.objects;
CREATE POLICY "Product insert admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products' AND is_admin());

DROP POLICY IF EXISTS "Product update admin" ON storage.objects;
CREATE POLICY "Product update admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND is_admin())
WITH CHECK (bucket_id = 'products' AND is_admin());

DROP POLICY IF EXISTS "Product delete admin" ON storage.objects;
CREATE POLICY "Product delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND is_admin());
