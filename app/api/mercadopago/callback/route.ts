import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * GET /api/mercadopago/callback?code=...
 * Troca o code do OAuth por access_token e salva no partners do usuário logado.
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

    await supabase
      .from("partners")
      .update({
        mp_account_id: String(data.user_id || data.public_key || "connected"),
        mp_connected_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/parceiro/configuracoes?mp=error", req.url));
  }
}
