"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, withTimeout } from "@/lib/supabase";
import { CATEGORY_OPTIONS } from "@/lib/partner-utils";
import { sendPush } from "@/lib/pushClient";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderItemId: number | string | null;
  clientName: string;
  clientPhone?: string | null;
  address?: string | null;
  total: number;
  initialCategory?: string;
  initialCommission?: number | null;
  onOfferCreated?: () => void;
}

/**
 * Modal admin: passar um item de pedido para o modo corrida de parceiros.
 * Cria a service_order (offered) e chama create_service_offer.
 */
export default function PassarParaParceiroDialog({
  open,
  onOpenChange,
  orderId,
  orderItemId,
  clientName,
  clientPhone,
  address,
  total,
  initialCategory,
  initialCommission,
  onOfferCreated,
}: Props) {
  const [category, setCategory] = useState<string>("");
  const [commission, setCommission] = useState("30");
  const [hours, setHours] = useState("24");
  const [saving, setSaving] = useState(false);
  const [partnerCount, setPartnerCount] = useState<number | null>(null);

  useEffect(() => {
    if (open && initialCategory) setCategory(initialCategory);
    if (open && initialCommission && initialCommission > 0)
      setCommission(String(Math.round(initialCommission)));
  }, [open, initialCategory, initialCommission]);

  useEffect(() => {
    if (!open || !category) {
      setPartnerCount(null);
      return;
    }
    const count = async () => {
      const { count } = await withTimeout(
        () =>
          supabase
            .from("partners")
            .select("id", { count: "exact", head: true })
            .eq("active", true)
            .contains("categories", [category]),
        5000,
        { count: 0 }
      );
      setPartnerCount(count || 0);
    };
    count();
  }, [open, category]);

  const handleConfirm = async () => {
    if (!category) return toast.error("Selecione a categoria");
    const pct = parseFloat(commission);
    if (isNaN(pct) || pct < 0 || pct > 100) return toast.error("Comissão inválida");
    const h = parseInt(hours);
    if (isNaN(h) || h <= 0) return toast.error("Tempo de oferta inválido");
    if (partnerCount === 0) return toast.error("Nenhum parceiro ativo nesta categoria");

    setSaving(true);
    try {
      // 1. Criar OS oferecida
      const { data: soId, error: soError } = await withTimeout(
        () =>
          supabase.rpc("create_offered_service_order", {
            p_order_id: orderId,
            p_order_item_id: orderItemId,
            p_client_name: clientName,
            p_client_phone: clientPhone || null,
            p_address: address || null,
            p_total: total,
          }),
        10000,
        { data: null, error: new Error("Timeout") }
      );

      if (soError || !soId) throw soError || new Error("Falha ao criar OS");

      // 2. Criar oferta (notifica parceiros)
      const { error: offerError } = await withTimeout(
        () =>
          supabase.rpc("create_service_offer", {
            p_service_order_id: soId,
            p_category: category,
            p_commission_percentage: pct,
            p_expiration_hours: h,
          }),
        10000,
        { error: new Error("Timeout") }
      );

      if (offerError) throw offerError;

      // Push best-effort para os parceiros da categoria
      try {
        const { data: catPartners } = await supabase
          .from("partners")
          .select("user_id")
          .eq("active", true)
          .contains("categories", [category]);
        const userIds = (catPartners || [])
          .map((p) => p.user_id)
          .filter(Boolean) as string[];
        if (userIds.length) {
          sendPush({
            title: "Novo serviço disponível!",
            message: `${category} — ${h}h para aceitar`,
            userIds,
            url: "/parceiro/ofertas",
          });
        }
      } catch {
        /* push é best-effort */
      }

      toast.success(`Oferta criada! ${partnerCount} parceiro(s) notificado(s).`);
      onOpenChange(false);
      onOfferCreated?.();
    } catch (err) {
      console.error("Erro ao criar oferta:", err);
      const msg =
        (err as { message?: string })?.message ||
        (err instanceof Error ? err.message : "") ||
        "";
      toast.error(
        msg && !msg.includes("[object Object]") && msg !== "Timeout"
          ? `Erro ao criar oferta: ${msg}`
          : "Erro ao criar oferta de serviço"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#C9A84C]" />
            Passar para Parceiro
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-white/50">
          {clientName} — {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>

        <div className="space-y-4">
          <div>
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-white text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {partnerCount != null && (
              <p className={`mt-1 text-xs ${partnerCount === 0 ? "text-red-400" : "text-green-400"}`}>
                {partnerCount === 0
                  ? "Nenhum parceiro ativo nesta categoria"
                  : `${partnerCount} parceiro(s) serão notificados`}
              </p>
            )}
          </div>

          <div>
            <Label>Comissão da empresa (%) *</Label>
            <input
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
            />
            <p className="mt-1 text-xs text-white/40">
              Parceiro recebe:{" "}
              {(total * (1 - (parseFloat(commission) || 0) / 100)).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div>
            <Label>Tempo de oferta (horas) *</Label>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                {["1", "2", "4", "8", "12", "24", "48", "72"].map((h) => (
                  <SelectItem key={h} value={h} className="text-white text-xs">
                    {h} hora(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !category}
            className="btn-premium-red flex items-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Oferta
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
