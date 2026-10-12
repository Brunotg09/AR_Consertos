import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * POST /api/mercadopago/disconnect
 * Desconecta a conta MP do parceiro logado.
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

    await supabase
      .from("partners")
      .update({ mp_account_id: null, mp_connected_at: null })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
