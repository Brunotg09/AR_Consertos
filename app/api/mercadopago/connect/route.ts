import { NextResponse } from "next/server";

/**
 * GET /api/mercadopago/connect
 * Redireciona o parceiro logado para o OAuth do Mercado Pago.
 * Requer: MP_CLIENT_ID, MP_REDIRECT_URI
 */
export async function GET(req: Request) {
  const clientId = process.env.MP_CLIENT_ID;
  const redirectUri =
    process.env.MP_REDIRECT_URI ||
    new URL("/api/mercadopago/callback", req.url).toString();

  if (!clientId) {
    return NextResponse.json(
      { error: "MP_CLIENT_ID não configurado" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    platform: "mp",
  });

  return NextResponse.redirect(
    `https://auth.mercadopago.com.br/authorize?${params.toString()}`
  );
}
