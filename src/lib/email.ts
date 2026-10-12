const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

interface SendEmailParams {
  type: "order_confirmation" | "order_to_admin" | "order_status_update";
  orderId: string;
  userId?: string;
  customerName?: string;
  status?: string;
}

export async function sendOrderEmail(params: SendEmailParams) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Email error:", data);
    }
    return data;
  } catch (err) {
    console.error("Email fetch error:", err);
  }
}
