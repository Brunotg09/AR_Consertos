"use client";

import { usePartner } from "@/hooks/usePartners";
import { maskPhone } from "@/lib/partner-utils";
import { supabase, withTimeout } from "@/lib/supabase";
import { Link2, Loader2, Shield, Unlink, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ParceiroConfiguracoes() {
  const { partner, loading, refresh } = usePartner();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    full_name: string;
    phone: string;
    bio: string;
    experience_years: string;
  } | null>(null);

  // Form inicializado quando partner carrega
  const effectiveForm =
    form ??
    (partner
      ? {
          full_name: partner.full_name,
          phone: partner.phone,
          bio: partner.bio || "",
          experience_years: partner.experience_years?.toString() || "",
        }
      : null);

  const handleSave = async () => {
    if (!partner || !effectiveForm) return;
    setSaving(true);
    const { error } = await withTimeout(
      () =>
        supabase
          .from("partners")
          .update({
            full_name: effectiveForm.full_name,
            phone: effectiveForm.phone,
            bio: effectiveForm.bio || null,
            experience_years: effectiveForm.experience_years
              ? parseInt(effectiveForm.experience_years)
              : null,
          })
          .eq("id", partner.id),
      8000,
      { error: new Error("Timeout") }
    );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Dados atualizados!");
    refresh();
  };

  const handleConnectMP = () => {
    // Será implementado na Fase 5 (OAuth Mercado Pago)
    window.location.href = "/api/mercadopago/connect";
  };

  const handleDisconnectMP = async () => {
    if (!partner) return;
    setSaving(true);
    const { error } = await withTimeout(
      () =>
        supabase
          .from("partners")
          .update({ mp_account_id: null, mp_connected_at: null })
          .eq("id", partner.id),
      8000,
      { error: new Error("Timeout") }
    );
    setSaving(false);
    if (error) {
      toast.error("Erro ao desconectar");
      return;
    }
    toast.success("Conta desconectada");
    refresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!partner || !effectiveForm) {
    return <div className="py-20 text-center text-white/60">Parceiro não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="mb-6 font-bebas text-4xl tracking-wide text-white">Configurações</h1>

      {/* Dados pessoais */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
          <User className="h-5 w-5" />
          <h2 className="font-bebas text-xl tracking-wide text-white">Dados Pessoais</h2>
        </div>


        <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div >
          <label className="mb-1 block text-xs text-white/40">Nome completo</label>
          <input
            value={effectiveForm.full_name}
            onChange={(e) => setForm({ ...effectiveForm, full_name: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
          />
        </div>
         
          <div>
            <label className="mb-1 block text-xs text-white/40">Email</label>
            <input
              value={partner.email}
              disabled
              className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/40"
            />
          </div>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/40">Telefone / WhatsApp</label>
            <input
              value={effectiveForm.phone}
              onChange={(e) => setForm({ ...effectiveForm, phone: maskPhone(e.target.value) })}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/40">Anos de experiência</label>
            <input
              type="number"
              value={effectiveForm.experience_years}
              onChange={(e) => setForm({ ...effectiveForm, experience_years: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-white/40">Bio</label>
          <textarea
            rows={3}
            value={effectiveForm.bio}
            onChange={(e) => setForm({ ...effectiveForm, bio: e.target.value })}
            placeholder="Breve descrição profissional..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 focus:border-[#C9A84C] focus:outline-none"
          />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-premium-red flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </button>
      </section>

      {/* Mercado Pago */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
          <Shield className="h-5 w-5" />
          <h2 className="font-bebas text-xl tracking-wide text-white">Pagamentos</h2>
        </div>

        {partner.mp_account_id ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="mb-1 text-sm text-green-400">✅ Conectado ao Mercado Pago</p>
            <p className="text-xs text-white/40">
              Conta: {partner.mp_account_id}
              {partner.mp_connected_at &&
                ` · desde ${new Date(partner.mp_connected_at).toLocaleDateString("pt-BR")}`}
            </p>
            <button
              onClick={handleDisconnectMP}
              disabled={saving}
              className="mt-3 flex items-center gap-2 text-sm text-red-400 hover:underline"
            >
              <Unlink className="h-4 w-4" /> Desconectar
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-white/60">
              Para receber seus pagamentos automaticamente com split, conecte sua conta
              Mercado Pago. Você precisará ter uma conta e autorizar o acesso.
            </p>
            <button
              onClick={handleConnectMP}
              className="flex items-center gap-2 rounded-xl bg-[#009EE3] px-5 py-3 text-sm font-medium text-white hover:bg-[#0086c9]"
            >
              <Link2 className="h-4 w-4" />
              Conectar com Mercado Pago
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
