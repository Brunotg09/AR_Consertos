import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

/**
 * GET /api/mercadopago/callback?code=...
 * Troca o code do OAuth por access_token e salva no partners do usuário logado.
 * O access_token/refresh_token (necessários para o SPLIT de comissão) são
 * gravados em `partner_mp_tokens` via service_role (tabela fechada p/ clientes).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=error", req.url));
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=config_error", req.url));
  }

  try {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri:
          process.env.MP_REDIRECT_URI ||
          new URL("/api/mercadopago/callback", req.url).toString(),
      }),
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=error", req.url));
    }

    const data = await res.json();

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Descobre o partner id do usuário logado
    const { data: partnerRow } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const partnerId = partnerRow?.id;

    // 1) Marca a conta como conectada (visível no painel)
    await supabase
      .from("partners")
      .update({
        mp_account_id: String(data.user_id || data.public_key || "connected"),
        mp_connected_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // 2) Salva os tokens OAuth (service_role — tabela fechada p/ clientes).
    //    São necessários p/ o split: o /pay usa access_token como Bearer.
    const admin = createAdminSupabase();
    if (admin && partnerId && data.access_token) {
      const expiresAt =
        typeof data.expires_in === "number" && data.expires_in > 0
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null;
      const { error: tokenErr } = await admin
        .from("partner_mp_tokens")
        .upsert(
          {
            partner_id: partnerId,
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "partner_id" }
        );
      if (tokenErr) {
        console.error("[MP/callback] falha ao salvar token do parceiro:", tokenErr.message);
      }
    } else if (!admin) {
      console.warn(
        "[MP/callback] ⚠️ SUPABASE_SERVICE_ROLE_KEY ausente — token OAuth não salvo (split não funcionará)"
      );
    }

    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=error", req.url));
  }
}
