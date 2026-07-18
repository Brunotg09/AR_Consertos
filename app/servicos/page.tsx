"use client";

import { ServiceCard } from "@/components/ServiceCard";
import { useServices } from "@/hooks/useServices";
import { Filter, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function ServicosPage() {
  const { services, loading } = useServices({ activeOnly: true, type: "convencional" });
  const categorias = useMemo(
    () => Array.from(new Set(services.map((s) => s.category))),
    [services]
  );
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("Todas");

  const filtrados =
    categoriaAtiva === "Todas"
      ? services
      : services.filter((s) => s.category === categoriaAtiva);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 rounded" style={{ backgroundColor: "#E30613" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          SERVIÇOS GERAIS
        </h1>
      </div>
      <p className="mt-2 text-sm" style={{ color: "#888888" }}>
        Catálogo completo de consertos de eletrodomésticos com garantia de 90 dias
      </p>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#888888" }}>
          <Filter className="h-3.5 w-3.5" />
          <span>Filtrar:</span>
        </div>
        <button
          onClick={() => setCategoriaAtiva("Todas")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            categoriaAtiva === "Todas"
              ? "text-white"
              : "border border-white/10 text-white/70 hover:bg-white/5"
          }`}
          style={categoriaAtiva === "Todas" ? { backgroundColor: "#E30613" } : undefined}
        >
          Todas
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoriaAtiva === cat
                ? "text-white"
                : "border border-white/10 text-white/70 hover:bg-white/5"
            }`}
            style={categoriaAtiva === cat ? { backgroundColor: "#E30613" } : undefined}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtrados.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="mt-12 text-center text-sm" style={{ color: "#888888" }}>
          Nenhum serviço encontrado nesta categoria.
        </div>
      )}
    </div>
  );
}
