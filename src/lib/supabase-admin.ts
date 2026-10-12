import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client service_role (SOMENTE servidor — nunca importar em "use client").
 *
 * Usado em rotas que precisam ler/escrever dados sem depender do RLS no contexto
 * de um usuário: webhooks (chamados pelo Mercado Pago, sem sessão) e rotas de
 * pagamento (onde a posse é validada manualmente). Retorna null se a chave não
 * estiver configurada (aí o chamador decide o fallback).
 */
export function createAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
