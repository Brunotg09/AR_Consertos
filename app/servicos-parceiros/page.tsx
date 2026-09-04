"use client";

import { ServiceCard } from "@/components/ServiceCard";
import { ServiceItem } from "@/hooks/useServices";
import { supabase } from "@/lib/supabase";
import { Building2, Loader2, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function ServicosParceirosPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title =
      "Serviços de Parceiros | A.R Conserto - Rede Autorizada";

    const fetchPartnerServices = async () => {
      try {
        const { data, error } = await supabase
          .from("partner_services")
          .select("*, partners:partner_id(name)")
          .eq("active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setServices(
          (data || []).map((s: any) => ({
            ...s,
            partner_name: s.partners?.name || null,
          }))
        );
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerServices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Hero */}
      <section
        className="border-b border-white/5"
        style={{ backgroundColor: "#161616" }}
      >
        <div className="mx-auto max-w-full px-4 py-16 sm:px-8 lg:px-20">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#10B98120" }}
            >
              <Building2 className="h-8 w-8" style={{ color: "#10B981" }} />
            </div>
            <div
              className="h-1 w-8 rounded"
              style={{ backgroundColor: "#10B981" }}
            />
            <h1 className="mt-4 font-bebas text-3xl tracking-wide text-white sm:text-5xl">
              REDE DE PARCEIROS
            </h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-relaxed"
              style={{ color: "#888888" }}
            >
              Empresas autorizadas pela A.R Conserto para realizar serviços
              especializados. Profissionais certificados com garantia total.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"
                style={{ color: "#10B981" }}
              >
                <Shield className="h-4 w-4" />
                <span>Garantia A.R Conserto</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"
                style={{ color: "#10B981" }}
              >
                <Users className="h-4 w-4" />
                <span>Equipe Certificada</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="mx-auto max-w-full px-4 py-12 sm:px-8 lg:px-20">
        {services.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} partner />
            ))}
          </div>
        ) : (
          <div className="mt-12 text-center text-sm" style={{ color: "#888888" }}>
            Nenhum serviço de parceiro disponível no momento.
          </div>
        )}
      </div>
    </div>
  );
}
