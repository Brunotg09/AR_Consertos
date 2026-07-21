"use client";

import { ServiceCard } from "@/components/ServiceCard";
import { useServices } from "@/hooks/useServices";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function BuscaContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const { services, loading } = useServices({ activeOnly: true });

  const serviceResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
    );
  }, [query, services]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto  max-w-full px-4 py-12 sm:px-8 lg:px-20">
      <div className="text-center">
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          BUSCAR
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Encontre serviços e produtos
        </p>
      </div>

      {/* Search bar */}
      <div className="mx-auto mt-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome de um serviço, produto ou categoria..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-10 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-white/[0.04]"
              style={{ color: "#888888" }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {query.trim() ? (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs" style={{ color: "#888888" }}>
              {serviceResults.length} resultado(s) em serviços
            </span>
          </div>

          {serviceResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviceResults.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <Search className="mx-auto h-10 w-10" style={{ color: "#444" }} />
              <p className="mt-4 text-sm" style={{ color: "#888888" }}>
                Nenhum resultado encontrado para &quot;{query}&quot;.
              </p>
              <p className="mt-1 text-xs" style={{ color: "#666666" }}>
                Tente buscar por outro termo ou navegue pelas categorias.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/servicos" className="btn-premium-red flex items-center gap-2">
                  Serviços
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/produtos"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]"
                >
                  Produtos
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm" style={{ color: "#888888" }}>
            Digite algo acima para começar a buscar.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto  max-w-full px-4 py-12 sm:px-8 lg:px-20 text-center">
        <p className="text-sm" style={{ color: "#888888" }}>Carregando...</p>
      </div>
    }>
      <BuscaContent />
    </Suspense>
  );
}
