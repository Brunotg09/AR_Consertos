"use client";

import { useState } from "react";
import { Loader2, QrCode, CreditCard, Copy, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrderId: string;
  serviceName: string;
  remainingAmount: number;
  onPaid?: () => void;
}

type Method = "pix" | "debit_card" | "credit_card";

/**
 * Modal de pagamento do cliente (PIX / cartão) via /api/mercadopago/pay.
 * PIX: parcial ou integral. Débito: parcial. Crédito: apenas integral.
 */
export default function PaymentDialog({
  open,
  onOpenChange,
  serviceOrderId,
  serviceName,
  remainingAmount,
  onPaid,
}: Props) {
  const [method, setMethod] = useState<Method>("pix");
  const [amount, setAmount] = useState(String(remainingAmount.toFixed(2)));
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  const parsedAmount = Number(amount.replace(",", "."));
  const isValidAmount =
    parsedAmount > 0 && parsedAmount <= remainingAmount + 0.01;
  const mustBeFull = method === "credit_card";
  const amountOk = mustBeFull
    ? Math.abs(parsedAmount - remainingAmount) < 0.01
    : isValidAmount;

  const reset = () => {
    setMethod("pix");
    setAmount(String(remainingAmount.toFixed(2)));
    setQrCode(null);
    setQrBase64(null);
    setCopied(false);
    setPaid(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const pay = async () => {
    if (!amountOk) {
      toast.error(
        mustBeFull
          ? "Cartão de crédito exige valor integral"
          : "Valor inválido"
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mercadopago/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceOrderId,
          paymentMethod: method,
          amount: parsedAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Erro ao processar pagamento");
        return;
      }

      if (method === "pix" && data.qrCode) {
        setQrCode(data.qrCode);
        setQrBase64(data.qrCodeBase64 || null);
        toast.info("Pague com PIX para concluir");
        // Polling: webhook confirma; aqui apenas atualizamos após 30s
        setTimeout(() => {
          onPaid?.();
        }, 30000);
        return;
      }

      setPaid(true);
      toast.success("Pagamento aprovado!");
      onPaid?.();
    } catch {
      toast.error("Erro de conexão");
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
      icon: <QrCode className="h-4 w-4" />,
      note: "Aprovação imediata · valor parcial permitido",
    },
    {
      value: "debit_card",
      label: "Cartão de Débito",
      icon: <CreditCard className="h-4 w-4" />,
      note: "Valor parcial permitido",
    },
    {
      value: "credit_card",
      label: "Cartão de Crédito",
      icon: <CreditCard className="h-4 w-4" />,
      note: "Somente valor integral",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bebas text-2xl tracking-wide">
            Pagar Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-white/70">{serviceName}</p>
            <p className="mt-1 font-oswald text-lg font-bold text-[#C9A84C]">
              Restante: R$ {remainingAmount.toFixed(2).replace(".", ",")}
            </p>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-12 w-12 text-[#22c55e]" />
              <p className="text-sm text-white/70">Pagamento aprovado!</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-3">
              {qrBase64 && (
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR Code PIX"
                  className="h-48 w-48 rounded-lg bg-white p-2"
                />
              )}
              <button
                onClick={copyPix}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.04]"
              >
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copiado!" : "Copiar código PIX"}
              </button>
              <p className="text-[11px] text-white/40">
                Após pagar, o status atualiza automaticamente.
              </p>
            </div>
          ) : (
            <>
              {/* Método */}
              <div className="space-y-2">
                <Label className="text-white/70">Forma de pagamento</Label>
                <div className="grid gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMethod(m.value);
                        if (m.value === "credit_card") {
                          setAmount(String(remainingAmount.toFixed(2)));
                        }
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        method === m.value
                          ? "border-[#C9A84C]/50 bg-[#C9A84C]/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span style={{ color: method === m.value ? "#C9A84C" : "#888" }}>
                        {m.icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{m.label}</p>
                        <p className="text-[11px] text-white/40">{m.note}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label className="text-white/70">
                  Valor {mustBeFull ? "(integral)" : "(parcial permitido)"}
                </Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remainingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={mustBeFull}
                  className="border-white/10 bg-white/[0.03] text-white"
                />
              </div>

              <button
                onClick={pay}
                disabled={loading || !amountOk}
                className="btn-premium-red w-full disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  `Pagar R$ ${(parsedAmount || 0).toFixed(2).replace(".", ",")}`
                )}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
