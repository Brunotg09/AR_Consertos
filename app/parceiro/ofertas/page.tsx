"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePartnerOffers, type PartnerOffer } from "@/hooks/usePartnerOffers";
import { formatBRL, offerCountdown, maskAddressForOffer } from "@/lib/partner-utils";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Percent,
  Phone,
  Wrench
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ParceiroOfertas() {
  const { offers, loading, acceptOffer } = usePartnerOffers();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<PartnerOffer | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleAccept = async (id: string) => {
    setAccepting(id);
    try {
      const ok = await acceptOffer(id);
      if (ok) {
        toast.success("Você aceitou o serviço! Acesse a aba Serviços.");
        setSelectedOffer(null);
      } else {
        toast.error("Este serviço já foi aceito por outro parceiro");
      }
    } finally {
      setAccepting(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-wide text-white">
          Ofertas Disponíveis ({offers.length})
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Aceite serviços da sua categoria e ganhe por conclusão
        </p>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <Bell className="mx-auto mb-4 h-10 w-10 text-white/20" />
          <p className="text-white/50">Nenhuma oferta disponível no momento.</p>
          <p className="mt-1 text-xs text-white/30">
            Quando um serviço da sua categoria for ofertado, você será notificado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((o) => {
            const countdown = offerCountdown(o.offer_expires_at);
            const isExpanded = expandedIds.has(o.id);
            const earn = (o.total || 0) * (1 - o.commission_percentage / 100);
            const commissionValue = (o.total || 0) * (o.commission_percentage / 100);

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/20"
              >
                {/* Header: categoria + comissão */}
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                        Nova Oferta
                      </span>
                      {o.category && (
                        <span className="rounded-full bg-[#C9A84C]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                          {o.category}
                        </span>
                      )}
                      {o.service_type && (
                        <span className="rounded-full bg-[#3b82f6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3b82f6]">
                          {o.service_type}
                        </span>
                      )}
                    </div>
                    <h2 className="truncate text-lg font-semibold text-white">
                      {o.item_name || o.category || "Serviço"}
                    </h2>
                    {o.item_description && (
                      <p className="mt-0.5 text-sm text-white/50 line-clamp-2">{o.item_description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Comissão</p>
                    <p className="font-bebas text-2xl text-[#C9A84C]">{o.commission_percentage}%</p>
                  </div>
                </div>

                {/* Cliente + Local */}
                <div className="grid gap-2 px-5 pb-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Cliente</span>
                    <p className="text-sm font-medium text-white">{o.client_name}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Local</span>
                    <p className="text-sm text-white/80">{maskAddressForOffer(o.address)}</p>
                    {o.scheduled_date && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                        <Calendar className="h-3 w-3" />
                        {new Date(o.scheduled_date).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="flex flex-wrap items-center gap-4 px-5 pb-3 text-sm">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Valor total</span>
                    <p className="font-bebas text-xl text-white">{formatBRL(o.total || 0)}</p>
                  </div>
                  <div className="text-white/30">−</div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Comissão ({o.commission_percentage}%)</span>
                    <p className="text-sm text-[#E30613]">− {formatBRL(commissionValue)}</p>
                  </div>
                  <div className="text-white/30">=</div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Seu ganho</span>
                    <p className="font-bebas text-xl text-[#22c55e]">{formatBRL(earn)}</p>
                  </div>
                </div>

                {/* Notas / O que vai fazer */}
                {(o.notes || o.item_description) && (
                  <div className="px-5 pb-3">
                  
                    {isExpanded && (
                      <div className="mt-2 space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        {o.item_description && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/40">Descrição do item</span>
                            <p className="text-sm text-white/70">{o.item_description}</p>
                          </div>
                        )}
                        {o.notes && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/40">Observações do pedido</span>
                            <p className="text-sm text-white/70">{o.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: expiração + ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-5 py-4">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${countdown.expired ? "text-[#E30613]" : "text-white/50"}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {countdown.expired ? "Oferta expirada" : `Expira em ${countdown.label}`}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedOffer(o)}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      Ver detalhes
                    </button>
                    <button
                      onClick={() => handleAccept(o.id)}
                      disabled={accepting === o.id || countdown.expired}
                      className="btn-premium-red flex items-center gap-2 disabled:opacity-50"
                    >
                      {accepting === o.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aceitar Serviço
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-lg overflow-x-hidden">
          {selectedOffer && (
            <>
              <DialogHeader>
                <DialogTitle className="font-bebas text-2xl tracking-wide text-white">
                  {selectedOffer.item_name || selectedOffer.category || "Serviço"}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/50">
                  {selectedOffer.category}
                  {selectedOffer.service_type && ` · ${selectedOffer.service_type}`}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Cliente */}
                <DetailSection title="Cliente" icon={<Phone className="h-4 w-4" />}>
                  <p className="text-sm font-medium text-white">{selectedOffer.client_name}</p>
                </DetailSection>

                {/* Local */}
                <DetailSection title="Local" icon={<MapPin className="h-4 w-4" />}>
                  <p className="text-sm text-white/80">{maskAddressForOffer(selectedOffer.address)}</p>
                  {selectedOffer.scheduled_date && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                      <Calendar className="h-3 w-3" />
                      Agendado: {new Date(selectedOffer.scheduled_date).toLocaleString("pt-BR")}
                    </p>
                  )}
                </DetailSection>

                {/* O que vai fazer */}
                {(selectedOffer.item_description || selectedOffer.notes) && (
                  <DetailSection title="O que vai fazer" icon={<Wrench className="h-4 w-4" />}>
                    {selectedOffer.item_description && (
                      <p className="text-sm text-white/70">{selectedOffer.item_description}</p>
                    )}
                    {selectedOffer.notes && (
                      <p className="mt-1 text-sm text-white/60">{selectedOffer.notes}</p>
                    )}
                  </DetailSection>
                )}

                {/* Valores */}
                <DetailSection title="Valores" icon={<Percent className="h-4 w-4" />}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Valor total</span>
                    <span className="font-medium text-white">{formatBRL(selectedOffer.total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Comissão ({selectedOffer.commission_percentage}%)</span>
                    <span className="text-[#E30613]">
                      − {formatBRL((selectedOffer.total || 0) * (selectedOffer.commission_percentage / 100))}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-sm font-medium text-white">Seu ganho</span>
                    <span className="font-bebas text-xl text-[#22c55e]">
                      {formatBRL((selectedOffer.total || 0) * (1 - selectedOffer.commission_percentage / 100))}
                    </span>
                  </div>
                </DetailSection>

                {/* Expiração */}
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                  <Clock className="h-3.5 w-3.5" />
                  Oferta expira em: {offerCountdown(selectedOffer.offer_expires_at).label}
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.04]"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => handleAccept(selectedOffer.id)}
                    disabled={accepting === selectedOffer.id}
                    className="btn-premium-red flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {accepting === selectedOffer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aceitar
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C9A84C]">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}