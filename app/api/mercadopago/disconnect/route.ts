import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

/**
 * POST /api/mercadopago/disconnect
 * Desconecta a conta MP do parceiro logado (limpa marcação E tokens OAuth).
 */
export async function POST() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Descobre o partner id p/ limpar os tokens
    const { data: partnerRow } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase
      .from("partners")
      .update({ mp_account_id: null, mp_connected_at: null })
      .eq("user_id", user.id);

    // Remove os tokens OAuth (tabela fechada — precisa service_role)
    const admin = createAdminSupabase();
    if (admin && partnerRow?.id) {
      await admin
        .from("partner_mp_tokens")
        .delete()
        .eq("partner_id", partnerRow.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
