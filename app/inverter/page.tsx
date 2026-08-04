"use client";

import { ServiceCard } from "@/components/ServiceCard";
import { useServices } from "@/hooks/useServices";
import { Cpu, Loader2, Microscope, Zap } from "lucide-react";

export default function InverterPage() {
  const { services, loading } = useServices({
    activeOnly: true,
    type: "inverter",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Hero inverter */}
      <section
        className="border-b border-white/5"
        style={{ backgroundColor: "#161616" }}
      >
        <div className="mx-auto  max-w-full px-4 py-12 sm:px-8 lg:px-20">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#8B5CF620" }}
            >
              <Cpu className="h-8 w-8" style={{ color: "#8B5CF6" }} />
            </div>
            <div
              className="h-1 w-8 rounded"
              style={{ backgroundColor: "#8B5CF6" }}
            />
            <h1 className="mt-4 font-bebas text-3xl tracking-wide text-white sm:text-5xl">
              ELETRÔNICA AVANÇADA INVERTER
            </h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-relaxed"
              style={{ color: "#888888" }}
            >
              Reparo em nível de componente de placas controladoras de
              ar-condicionado inverter, inversores solares e fontes chaveadas.
              Laboratório equipado com osciloscópio, estação de solda e fonte de
              bancada.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"
                style={{ color: "#8B5CF6" }}
              >
                <Zap className="h-4 w-4" />
                <span>Alta Precisão</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"
                style={{ color: "#8B5CF6" }}
              >
                <Microscope className="h-4 w-4" />
                <span>Diagnóstico Avançado</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs"
                style={{ color: "#8B5CF6" }}
              >
                <Cpu className="h-4 w-4" />
                <span>Reparo de Componentes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="mx-auto  max-w-full px-4 py-12 sm:px-8 lg:px-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              variant="inverter"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
