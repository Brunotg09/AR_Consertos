"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  QrCode,
  CreditCard,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  /** Método pré-selecionado conforme a escolha no checkout. */
  initialMethod?: Method;
  /** Chamado quando o cliente paga OU decide pagar depois (checkout finaliza e redireciona). */
  onComplete: () => void;
}

type Method = "pix" | "debit_card" | "credit_card";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "";

/** Chave por pedido p/ lembrar o método escolhido mesmo se a aba/recarregar. */
const methodKey = (orderId: string) => `arc_pay_method_${orderId}`;

/** Carrega o SDK do Mercado Pago (v2) sob demanda. */
function loadMpSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.MercadoPago) return resolve(w.MercadoPago);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-mp-sdk="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(w.MercadoPago));
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar SDK do Mercado Pago"))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.mpSdk = "true";
    const timeout = setTimeout(() => {
      reject(new Error("Timeout ao carregar SDK do Mercado Pago (SDK)"));
    }, 15000);
    script.onload = () => {
      clearTimeout(timeout);
      resolve(w.MercadoPago);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      console.error("[MP/card] falha ao baixar o script do SDK:", script.src);
      reject(new Error("Falha ao carregar SDK do Mercado Pago"));
    };
    document.body.appendChild(script);
  });
}

/** Fallback de detecção de bandeira (o token do MP traz o authoritative payment_method_id). */
function detectBrand(value: string): string {
  const n = value.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "master";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(606282|3841)/.test(n)) return "hipercard";
  if (/^(4011|4312|4389|5041|5066|5067|5090|6277|6362|6363|65)/.test(n)) return "elo";
  if (/^3(?:0[0-5]|[68])/.test(n)) return "diners";
  if (/^6(?:011|4[4-9]|5)/.test(n)) return "discover";
  return "visa";
}

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  amex: "Amex",
  hipercard: "Hipercard",
  elo: "Elo",
  diners: "Diners",
  discover: "Discover",
};

function formatCardNumber(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 16);
  return n.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 4);
  if (n.length <= 2) return n;
  return `${n.slice(0, 2)}/${n.slice(2)}`;
}

/** Verifica no banco se os itens de produto do pedido já foram pagos. */
async function fetchOrderPaid(orderId: string): Promise<boolean> {
  const { data } = await supabase
    .from("order_items")
    .select("payment_status")
    .eq("order_id", orderId)
    .eq("item_type", "produto");
  if (!data || data.length === 0) return false;
  return data.every((it) => it.payment_status === "pago");
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
          done
            ? "border-transparent bg-[#22c55e] text-black"
            : active
            ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]"
            : "border-white/15 text-white/40"
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span
        className={`text-[10px] tracking-wide ${
          active || done ? "text-white/70" : "text-white/35"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Modal de pagamento de PEDIDO DE PRODUTO no checkout.
 * PIX: gera QR e espera confirmação (webhook). Cartão: tokeniza via SDK do MP.
 * "Pagar depois" mantém o pedido pendente (estoque reservado) — paga no /historico.
 * O fechamento externo (clique fora / ESC / X) é bloqueado: força escolha explícita.
 * Não existe "cancelar" aqui — a saída é sempre "Pagar depois" (pedido fica pendente).
 */
export default function ProductPaymentModal({
  open,
  onOpenChange,
  orderId,
  amount,
  initialMethod,
  onComplete,
}: Props) {
  const [method, setMethod] = useState<Method>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(methodKey(orderId));
      if (saved === "pix" || saved === "credit_card" || saved === "debit_card") return saved;
    }
    return initialMethod || "pix";
  });
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pixSeconds, setPixSeconds] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCvv] = useState("");
  const [cardCpf, setCpf] = useState("");

  const orderRef = orderId.slice(0, 8).toUpperCase();
  const amountLabel = amount.toFixed(2).replace(".", ",");
  const brand = detectBrand(cardNumber);
  const brandKnown = cardNumber.replace(/\D/g, "").length >= 6 && !!BRAND_LABEL[brand];
  const pixRemaining = Math.max(0, 180 - pixSeconds);
  const pixCountdown = `${String(Math.floor(pixRemaining / 60)).padStart(2, "0")}:${String(
    pixRemaining % 60
  ).padStart(2, "0")}`;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const reset = () => {
    stopPolling();
    setQrCode(null);
    setQrBase64(null);
    setCopied(false);
    setPaid(false);
    setLoading(false);
    setPixSeconds(0);
    setCardNumber("");
    setCardName("");
    setCardExpiry("");
    setCvv("");
    setCpf("");
  };

  const changeMethod = (m: Method) => {
    setMethod(m);
    try {
      sessionStorage.setItem(methodKey(orderId), m);
    } catch {
      /* ignore */
    }
    // Pré-carrega o SDK em segundo plano ao escolher cartão (pagar fica instantâneo)
    if (m !== "pix" && PUBLIC_KEY) loadMpSdk().catch(() => {});
  };

  // Bloqueia fechamento externo (clique fora / ESC / X): força o cliente a escolher
  // entre pagar ou usar o botão explícito "Pagar depois".
  const handleOpenChange = (v: boolean) => {
    if (!v) return; // ignora o dismiss — o modal permanece aberto
    onOpenChange(true);
  };

  // Saída explícita SEM pagar: o pedido fica pendente (estoque reservado),
  // o checkout então finaliza (limpa carrinho, e-mails e redireciona).
  const handlePayLater = () => {
    reset();
    try {
      sessionStorage.removeItem(methodKey(orderId));
    } catch {
      /* ignore */
    }
    onComplete();
  };

  // Polling do status do pedido (webhook/MP marcam order_items.payment_status = "pago")
  useEffect(() => {
    if (!open || !qrCode || paid) return;
    let attempts = 0;
    const maxAttempts = 60; // ~3 min
    pollRef.current = setInterval(async () => {
      attempts += 1;
      setPixSeconds(attempts * 3);
      const isPaid = await fetchOrderPaid(orderId);
      if (isPaid) {
        stopPolling();
        setPaid(true);
        toast.success("Pagamento aprovado!");
        setTimeout(() => {
          reset();
          try {
            sessionStorage.removeItem(methodKey(orderId));
          } catch {
            /* ignore */
          }
          onComplete();
        }, 1600);
      } else if (attempts >= maxAttempts) {
        stopPolling();
        toast.info(
          "A confirmação está demorando. Verifique o pedido na página Histórico."
        );
      }
    }, 3000);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, qrCode, paid, orderId]);

  const payPix = async () => {
    setLoading(true);
    try {
      const payload = { orderId, paymentMethod: "pix", amount };
      const res = await fetch("/api/mercadopago/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("[MP/modal] payPix ←", res.status, data);
      if (!res.ok) {
        toast.error(data?.error || "Erro ao gerar PIX");
        return;
      }
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrBase64(data.qrCodeBase64 || null);
        setPixSeconds(0);
        toast.info("Pague com PIX para concluir");
      }
    } catch (e) {
      console.error("[MP/modal] payPix erro:", e);
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const payCard = async () => {
    if (!PUBLIC_KEY) {
      toast.error("Pagamento por cartão não configurado (chave pública)");
      return;
    }
    const digits = cardNumber.replace(/\D/g, "");
    const [mm, yy] = cardExpiry.split("/");
    if (digits.length < 12) return toast.error("Número do cartão inválido");
    if (!cardName.trim()) return toast.error("Informe o nome no cartão");
    if (!mm || !yy) return toast.error("Informe a validade");
    if (cardCvv.length < 3) return toast.error("CVV inválido");
    if (cardCpf.replace(/\D/g, "").length !== 11) return toast.error("CPF inválido");

    setLoading(true);
    try {
      const MP = await loadMpSdk();
      const mp = new MP(PUBLIC_KEY);

      // payment_method_id confiável: detectado pelo BIN junto ao Mercado Pago
      let pmId = "";
      try {
        const pm = await mp.getPaymentMethods({ bin: digits.slice(0, 8) });
        pmId = pm?.results?.[0]?.id || "";
      } catch (e) {
        console.warn("[MP/card] getPaymentMethods falhou:", e);
      }
      if (!pmId) pmId = brand;

      const tokenRes = await mp.createCardToken({
        cardNumber: digits,
        cardholderName: cardName,
        cardExpirationMonth: (mm || "").trim().padStart(2, "0"),
        cardExpirationYear: yy ? `20${yy}` : "",
        securityCode: cardCvv,
        identificationType: "CPF",
        identificationNumber: cardCpf.replace(/\D/g, ""),
      });

      const cardToken = tokenRes?.id;
      if (!cardToken) {
        toast.error("Não foi possível tokenizar o cartão");
        return;
      }

      const res = await fetch("/api/mercadopago/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod: method,
          amount,
          cardToken,
          cardPaymentMethodId: pmId,
          installments: 1,
        }),
      });
      const data = await res.json();
      console.log("[MP/card] /pay ←", res.status, data);
      if (!res.ok) {
        toast.error(data?.error || "Pagamento recusado");
        return;
      }

      if (data.status === "approved") {
        setPaid(true);
        toast.success("Pagamento aprovado!");
        setTimeout(() => {
          reset();
          try {
            sessionStorage.removeItem(methodKey(orderId));
          } catch {
            /* ignore */
          }
          onComplete();
        }, 1600);
      } else {
        // Aguardando (ex.: análise de risco) — webhook confirma depois
        toast.info("Pagamento em análise. Você será notificado.");
        reset();
        try {
          sessionStorage.removeItem(methodKey(orderId));
        } catch {
          /* ignore */
        }
        onComplete();
      }
    } catch (e) {
      console.error("[MP/card] erro:", e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("SDK")
          ? "Falha ao carregar o Mercado Pago. Verifique sua conexão."
          : "Erro ao processar o cartão"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const methods: { value: Method; label: string; icon: React.ReactNode; note: string }[] = [
    {
      value: "pix",
      label: "PIX",
      icon: <QrCode className="h-5 w-5" />,
      note: "Aprovação imediata · Sem taxas",
    },
    {
      value: "credit_card",
      label: "Cartão de Crédito",
      icon: <CreditCard className="h-5 w-5" />,
      note: "Valor integral · Parcele na hora",
    },
    {
      value: "debit_card",
      label: "Cartão de Débito",
      icon: <Smartphone className="h-5 w-5" />,
      note: "Valor integral · Débito na conta",
    },
  ];

  const cardForm = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-white/70">Número do cartão</Label>
        <div className="relative">
          <Input
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="border-white/10 bg-white/[0.03] pr-16 text-white"
          />
          {brandKnown && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
              {BRAND_LABEL[brand]}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-white/70">Nome no cartão</Label>
        <Input
          placeholder="Como impresso no cartão"
          value={cardName}
          onChange={(e) => setCardName(e.target.value.toUpperCase())}
          className="border-white/10 bg-white/[0.03] text-white"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-white/70">Validade</Label>
          <Input
            inputMode="numeric"
            placeholder="MM/AA"
            value={cardExpiry}
            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
            className="border-white/10 bg-white/[0.03] text-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/70">CVV</Label>
          <Input
            inputMode="numeric"
            placeholder="123"
            value={cardCvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="border-white/10 bg-white/[0.03] text-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/70">CPF</Label>
          <Input
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cardCpf}
            onChange={(e) =>
              setCpf(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 11)
                  .replace(/(\d{3})(\d)/, "$1.$2")
                  .replace(/(\d{3})(\d)/, "$1.$2")
                  .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
              )
            }
            className="border-white/10 bg-white/[0.03] text-white"
          />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-white/40">
        <Lock className="h-3 w-3" />
        Dados tokenizados pelo Mercado Pago — não passam pelos nossos servidores.
      </p>
    </div>
  );

  const step = paid ? 3 : qrCode ? 2 : 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose
        className="flex flex-col gap-0 overflow-hidden border-white/10 bg-[#0f0f0f] p-0 sm:max-w-lg"
      >
        {/* Cabeçalho */}
        <div className="relative border-b border-white/10 px-6 pb-5 pt-6">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)" }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-bebas text-2xl leading-none tracking-wide text-white">
                  Finalizar Pagamento
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-white/50">
                  Pedido <span className="font-semibold text-white/70">#{orderRef}</span> ·
                  Pagamento seguro
                </DialogDescription>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/50">
              <ShieldCheck className="h-3 w-3 text-[#22c55e]" />
              MP
            </span>
          </div>

          {/* Passos */}
          <div className="relative mt-5 flex items-center">
            <StepDot n={1} label="Método" active={step === 1} done={step > 1} />
            <div className={`h-px flex-1 ${step > 1 ? "bg-[#22c55e]/50" : "bg-white/10"}`} />
            <StepDot n={2} label="Pagamento" active={step === 2} done={step > 2} />
            <div className={`h-px flex-1 ${step > 2 ? "bg-[#22c55e]/50" : "bg-white/10"}`} />
            <StepDot n={3} label="Confirmação" active={step === 3} done={false} />
          </div>
        </div>

        {/* Valor */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <span className="text-xs uppercase tracking-wider text-white/40">Total do pedido</span>
          <span className="font-oswald text-2xl font-bold text-[#C9A84C]">
            R$ {amountLabel}
          </span>
        </div>

        {/* Corpo — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#22c55e]/20" />
                <CheckCircle2 className="relative h-14 w-14 text-[#22c55e]" />
              </div>
              <p className="font-bebas text-xl tracking-wide text-white">Pagamento aprovado!</p>
              <p className="text-xs text-white/50">Estamos preparando seu pedido.</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative rounded-2xl bg-white p-3 shadow-[0_0_40px_rgba(201,168,76,0.15)]">
                {qrBase64 ? (
                  <img
                    src={`data:image/png;base64,${qrBase64}`}
                    alt="QR Code PIX"
                    className="h-52 w-52"
                  />
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center text-xs text-black/40">
                    Copie o código abaixo
                  </div>
                )}
              </div>
              <button
                onClick={copyPix}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Código copiado!" : "Copiar código PIX"}
              </button>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C9A84C]" />
                Aguardando pagamento…
                <span className="tabular-nums text-white/70">{pixCountdown}</span>
              </div>
              <p className="text-center text-[11px] text-white/40">
                Abra o app do seu banco, escolha PIX e escaneie o código.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {methods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => changeMethod(m.value)}
                    className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                      method === m.value
                        ? "border-[#C9A84C]/50 bg-[#C9A84C]/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        method === m.value
                          ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                          : "bg-white/[0.04] text-white/50"
                      }`}
                    >
                      {m.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-[11px] text-white/40">{m.note}</p>
                    </div>
                    <div
                      className={`relative h-4 w-4 rounded-full border-2 transition-colors ${
                        method === m.value ? "border-[#C9A84C]" : "border-white/20"
                      }`}
                    >
                      {method === m.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {method !== "pix" && cardForm}
            </div>
          )}
        </div>

        {/* Rodapé / ações */}
        {!paid && (
          <div className="space-y-2 border-t border-white/10 px-6 py-4">
            {/* Botão "Voltar" na etapa 2 (pagamento) */}
            {(step === 2) && (
              <button
                type="button"
                onClick={() => {
                  setQrCode(null);
                  setQrBase64(null);
                  setPixSeconds(0);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.06]"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Voltar à escolha do método
              </button>
            )}
            <button
              onClick={method === "pix" ? payPix : payCard}
              disabled={loading || (!!qrCode && method === "pix")}
              className="btn-premium-red flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando…
                </span>
              ) : qrCode && method === "pix" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando pagamento
                </>
              ) : method === "pix" ? (
                <>
                  <QrCode className="h-4 w-4" />
                  Gerar QR Code PIX
                </>
              ) : (
                <>
                  Pagar R$ {amountLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePayLater}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-white/45 transition-colors hover:text-white/80"
            >
              Pagar depois (pedido fica pendente)
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
