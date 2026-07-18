-- ============================================================
-- STORAGE: service-images bucket
-- Cole no Supabase SQL Editor e rode
-- ============================================================

-- 1. Criar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de acesso
-- Leitura pública
DROP POLICY IF EXISTS "Service images public read" ON storage.objects;
CREATE POLICY "Service images public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'service-images');

-- Admin pode inserir
DROP POLICY IF EXISTS "Service images insert admin" ON storage.objects;
CREATE POLICY "Service images insert admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images' AND is_admin());

-- Admin pode atualizar
DROP POLICY IF EXISTS "Service images update admin" ON storage.objects;
CREATE POLICY "Service images update admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images' AND is_admin())
WITH CHECK (bucket_id = 'service-images' AND is_admin());

-- Admin pode deletar
DROP POLICY IF EXISTS "Service images delete admin" ON storage.objects;
CREATE POLICY "Service images delete admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images' AND is_admin());
