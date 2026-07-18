import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.ARC_SYS_GATEWAY_ENDPOINT || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.ARC_SYS_CLIENT_PASSKEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL e/ou chave anon não configurados. Verifique as variáveis de ambiente."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
