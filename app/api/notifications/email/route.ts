import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/smtp";
import { createServerSupabase } from "@/lib/supabase-server";

interface EmailRequest {
  type: "order_confirmation" | "order_to_admin" | "order_status_update";
  orderId: string;
  userId?: string;
  customerName?: string;
  status?: string;
}

function getBaseUrl(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "";
  return url.origin;
}

function buildOrderConfirmationEmail(data: {
  orderId: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  trackingUrl: string;
}) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#CCCCCC;font-size:14px;">
          ${item.name}
        </td>
        <td align="center" style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#888888;font-size:14px;">
          ${item.quantity}
        </td>
        <td align="right" style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#FFFFFF;font-size:14px;font-weight:600;">
          R$ ${item.price.toFixed(2).replace(".", ",")}
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pedido Recebido — AR Consertos</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#E30613 0%,#8B5CF6 50%,#C9A84C 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <div style="display:inline-block;width:72px;height:72px;border-radius:50%;border:2.5px solid #C9A84C;background-color:#222222;line-height:72px;text-align:center;font-size:28px;box-shadow:0 0 16px rgba(201,168,76,0.35);">✅</div>
              <div style="padding-top:14px;font-size:26px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">
                <span style="color:#E30613;">A.R</span> CONSERTO
              </div>
              <div style="padding-top:4px;font-size:11px;color:#888888;letter-spacing:3px;text-transform:uppercase;">
                TÉCNICO · ELETRODOMÉSTICOS · <span style="color:#8B5CF6;">INVERTER</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;">Pedido Recebido!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
                Olá <strong style="color:#FFFFFF;">${data.customerName}</strong>, recebemos seu pedido <strong style="color:#C9A84C;">#${data.orderId.slice(0, 8).toUpperCase()}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#222222;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;background-color:#2a2a2a;border-bottom:1px solid #333333;">
                    <span style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Itens do Pedido</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#888888;font-size:12px;text-transform:uppercase;">Item</td>
                        <td align="center" style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#888888;font-size:12px;text-transform:uppercase;">Qtd</td>
                        <td align="right" style="padding:12px 16px;border-bottom:1px solid #2d2d2d;color:#888888;font-size:12px;text-transform:uppercase;">Preço</td>
                      </tr>
                      ${itemsHtml}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-size:14px;color:#888888;">Total</td>
                        <td align="right" style="font-size:20px;font-weight:700;color:#C9A84C;">R$ ${data.total.toFixed(2).replace(".", ",")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1f1f1f;border:1px solid #2d2d2d;border-left:3px solid #8B5CF6;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
                      📋 <strong style="color:#8B5CF6;">Próximos passos:</strong><br/>
                      Aguarde a confirmação do nosso time. Você receberá um e-mail quando seu pedido for processado.
                    </p>
                  </td>
                </tr>
              </table>

              <a href="${data.trackingUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#E30613,#8B5CF6);color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
                Acompanhar Pedido
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;color:#FFFFFF;font-weight:600;">AR Consertos — Itabaiana/SE</p>
              <p style="margin:0 0 4px;font-size:12px;color:#666666;">📞 (79) 9 9944-6596 &nbsp;·&nbsp; 📷 @A.RCONSERTOS</p>
              <p style="margin:0 0 16px;font-size:11px;color:#555555;">Seg – Sex: 8h às 18h &nbsp;|&nbsp; Sáb: 8h às 12h</p>
              <div style="height:1px;width:60px;background:#C9A84C;margin:0 auto 16px;border-radius:2px;"></div>
              <p style="margin:0;font-size:10px;color:#444444;">© 2026 AR Consertos · Todos os direitos reservados</p>
            </td>
          </tr>

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#C9A84C 0%,#8B5CF6 50%,#E30613 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOrderToAdminEmail(data: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  adminUrl: string;
}) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #2d2d2d;color:#CCCCCC;font-size:14px;">${item.name}</td>
        <td align="center" style="padding:10px 16px;border-bottom:1px solid #2d2d2d;color:#888888;font-size:14px;">${item.quantity}</td>
        <td align="right" style="padding:10px 16px;border-bottom:1px solid #2d2d2d;color:#FFFFFF;font-size:14px;font-weight:600;">R$ ${item.price.toFixed(2).replace(".", ",")}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novo Pedido — AR Consertos</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#E30613 0%,#8B5CF6 50%,#C9A84C 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <div style="display:inline-block;width:72px;height:72px;border-radius:50%;border:2.5px solid #C9A84C;background-color:#222222;line-height:72px;text-align:center;font-size:28px;box-shadow:0 0 16px rgba(201,168,76,0.35);">🔔</div>
              <div style="padding-top:14px;font-size:26px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">
                <span style="color:#E30613;">A.R</span> CONSERTO
              </div>
              <div style="padding-top:4px;font-size:11px;color:#888888;letter-spacing:3px;text-transform:uppercase;">
                TÉCNICO · ELETRODOMÉSTICOS · <span style="color:#8B5CF6;">INVERTER</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;">Novo Pedido Recebido</p>
              <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
                Um novo pedido foi realizado por <strong style="color:#FFFFFF;">${data.customerName}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#222222;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;background-color:#2a2a2a;border-bottom:1px solid #333333;">
                    <span style="font-size:12px;color:#C9A84C;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Pedido #${data.orderId.slice(0, 8).toUpperCase()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:8px 0;color:#888888;font-size:13px;">Cliente</td>
                        <td align="right" style="padding:8px 0;color:#FFFFFF;font-size:13px;font-weight:600;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#888888;font-size:13px;">Email</td>
                        <td align="right" style="padding:8px 0;color:#FFFFFF;font-size:13px;">${data.customerEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-top:1px solid #333333;color:#888888;font-size:13px;">Total</td>
                        <td align="right" style="padding:8px 0;border-top:1px solid #333333;color:#C9A84C;font-size:18px;font-weight:700;">R$ ${data.total.toFixed(2).replace(".", ",")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <a href="${data.adminUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#E30613,#8B5CF6);color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
                Ver Pedido no Painel
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;color:#FFFFFF;font-weight:600;">AR Consertos — Itabaiana/SE</p>
              <p style="margin:0;font-size:10px;color:#444444;">© 2026 AR Consertos · Todos os direitos reservados</p>
            </td>
          </tr>

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#C9A84C 0%,#8B5CF6 50%,#E30613 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildStatusUpdateEmail(data: {
  orderId: string;
  customerName: string;
  status: string;
  trackingUrl: string;
}) {
  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    orcamento_enviado: "Orçamento Enviado",
    em_andamento: "Em Andamento",
    pronto: "Pronto para Entrega",
    entregue: "Entregue",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    pendente: "#EAB308",
    orcamento_enviado: "#06B6D4",
    em_andamento: "#8B5CF6",
    pronto: "#10B981",
    entregue: "#14B8A6",
    concluido: "#22C55E",
    cancelado: "#EF4444",
  };

  const statusLabel = statusLabels[data.status] || data.status;
  const statusColor = statusColors[data.status] || "#8B5CF6";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Status Atualizado — AR Consertos</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#E30613 0%,#8B5CF6 50%,#C9A84C 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <div style="display:inline-block;width:72px;height:72px;border-radius:50%;border:2.5px solid ${statusColor};background-color:#222222;line-height:72px;text-align:center;font-size:28px;box-shadow:0 0 16px ${statusColor}33;">📋</div>
              <div style="padding-top:14px;font-size:26px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">
                <span style="color:#E30613;">A.R</span> CONSERTO
              </div>
              <div style="padding-top:4px;font-size:11px;color:#888888;letter-spacing:3px;text-transform:uppercase;">
                TÉCNICO · ELETRODOMÉSTICOS · <span style="color:#8B5CF6;">INVERTER</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;">Status Atualizado</p>
              <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
                Olá <strong style="color:#FFFFFF;">${data.customerName}</strong>, o status do seu pedido foi atualizado.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#222222;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Pedido</p>
                    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#C9A84C;">#${data.orderId.slice(0, 8).toUpperCase()}</p>
                    <div style="display:inline-block;padding:8px 20px;background-color:${statusColor}22;border:1px solid ${statusColor};border-radius:20px;">
                      <span style="font-size:14px;font-weight:600;color:${statusColor};text-transform:uppercase;letter-spacing:1px;">${statusLabel}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <a href="${data.trackingUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#E30613,#8B5CF6);color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
                Acompanhar Pedido
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333333,transparent);"></div></td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;color:#FFFFFF;font-weight:600;">AR Consertos — Itabaiana/SE</p>
              <p style="margin:0 0 4px;font-size:12px;color:#666666;">📞 (79) 9 9944-6596 &nbsp;·&nbsp; 📷 @A.RCONSERTOS</p>
              <p style="margin:0 0 16px;font-size:11px;color:#555555;">Seg – Sex: 8h às 18h &nbsp;|&nbsp; Sáb: 8h às 12h</p>
              <div style="height:1px;width:60px;background:#C9A84C;margin:0 auto 16px;border-radius:2px;"></div>
              <p style="margin:0;font-size:10px;color:#444444;">© 2026 AR Consertos · Todos os direitos reservados</p>
            </td>
          </tr>

          <tr>
            <td height="4" style="background:linear-gradient(90deg,#C9A84C 0%,#8B5CF6 50%,#E30613 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body: EmailRequest = await req.json();
    const { type, orderId, userId, customerName, status } = body;

    if (!type || !orderId) {
      return NextResponse.json({ error: "type and orderId are required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, user:user_id(full_name), cliente:cliente_id(nome, email)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: privateData } = await supabase
      .from("user_private")
      .select("email")
      .eq("id", order.user_id)
      .single();

    const baseUrl = getBaseUrl(req);
    const customerEmail = privateData?.email || order.cliente?.email;
    const customerFullName = order.user?.full_name || order.cliente?.nome || customerName || "Cliente";

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("item_name, quantity, price")
      .eq("order_id", orderId);

    const items = (orderItems || []).map((i: any) => ({
      name: i.item_name,
      quantity: i.quantity,
      price: i.price,
    }));

    const total = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    let subject = "";
    let html = "";

    switch (type) {
      case "order_confirmation": {
        if (!customerEmail) {
          return NextResponse.json({ error: "Customer email not found" }, { status: 400 });
        }
        subject = `Recebemos seu pedido #${orderId.slice(0, 8).toUpperCase()} — AR Consertos`;
        html = buildOrderConfirmationEmail({
          orderId,
          customerName: customerFullName,
          items,
          total,
          trackingUrl: `${baseUrl}/pedido/${orderId}`,
        });
        await sendEmail({ to: customerEmail, subject, html });
        break;
      }

      case "order_to_admin": {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (!admins || admins.length === 0) {
          return NextResponse.json({ message: "No admins to notify" });
        }

        const adminEmails: string[] = [];
        for (const admin of admins) {
          const { data: adminPrivate } = await supabase
            .from("user_private")
            .select("email")
            .eq("id", admin.user_id)
            .single();
          if (adminPrivate?.email) adminEmails.push(adminPrivate.email);
        }

        if (adminEmails.length === 0) {
          return NextResponse.json({ message: "No admin emails found" });
        }

        subject = `Novo Pedido #${orderId.slice(0, 8).toUpperCase()} — AR Consertos`;
        html = buildOrderToAdminEmail({
          orderId,
          customerName: customerFullName,
          customerEmail: customerEmail || "N/A",
          items,
          total,
          adminUrl: `${baseUrl}/private/pedido/${orderId}`,
        });

        for (const email of adminEmails) {
          await sendEmail({ to: email, subject, html });
        }
        break;
      }

      case "order_status_update": {
        if (!customerEmail) {
          return NextResponse.json({ error: "Customer email not found" }, { status: 400 });
        }
        if (!status) {
          return NextResponse.json({ error: "status is required" }, { status: 400 });
        }
        subject = `Seu pedido #${orderId.slice(0, 8).toUpperCase()} — Status: ${status} — AR Consertos`;
        html = buildStatusUpdateEmail({
          orderId,
          customerName: customerFullName,
          status,
          trackingUrl: `${baseUrl}/pedido/${orderId}`,
        });
        await sendEmail({ to: customerEmail, subject, html });
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
