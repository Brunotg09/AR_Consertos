import { HeroCarousel } from "@/components/HeroCarousel";
import { ServiceCard } from "@/components/ServiceCard";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Cpu, ShoppingBag, Wrench } from "lucide-react";
import Link from "next/link";

async function getServices() {
  try {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

async function getProducts() {
  try {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("id", { ascending: false })
      .limit(4);
    return data || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const allServices = await getServices();
  const convencionais = allServices
    .filter((s) => s.type === "convencional")
    .sort(() => Math.random() - 0.5)
    .slice(0, 12);
  const inverters = allServices.filter((s) => s.type === "inverter");
  const products = await getProducts();

  return (
    <div>
      <HeroCarousel />

      {/* Seção O QUE CONSERTAMOS */}
      <section className="relative overflow-hidden">
        <div className="section-glow-red" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="h-px w-10 rounded" style={{ backgroundColor: "#E30613" }} />
              <span className="font-oswald text-[10px] tracking-widest uppercase" style={{ color: "#E30613" }}>
                Serviços
              </span>
            </div>
            <h2 className="mt-4 font-bebas text-5xl tracking-widest text-white sm:text-6xl lg:text-7xl">
              O QUE CONSERTAMOS
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#a0a0a0" }}>
              Serviços convencionais com garantia de 90 dias em Itabaiana/SE. Desde linha branca até ferramentas e entretenimento.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {convencionais.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/servicos" className="btn-premium-red inline-flex items-center gap-2">
              Ver Todos os Serviços
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Seção REPARO DE ELETRÔNICA INVERTER */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#141414" }}>
        <div className="section-glow-purple" />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 opacity-20"
          style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, #8B5CF6 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="h-px w-10 rounded" style={{ backgroundColor: "#8B5CF6" }} />
              <span className="font-oswald text-[10px] tracking-widest uppercase" style={{ color: "#8B5CF6" }}>
                Tecnologia Avançada
              </span>
            </div>
            <h2 className="mt-4 font-bebas text-5xl tracking-widest text-white sm:text-6xl lg:text-7xl">
              REPARO DE ELETRÔNICA INVERTER
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#a0a0a0" }}>
              Laboratório equipado para reparo em nível de componente. Placas de ar-condicionado inverter, inversores solares e fontes chaveadas.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs" style={{ borderColor: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", backgroundColor: "rgba(139, 92, 246, 0.06)" }}>
              <Cpu className="h-3.5 w-3.5" />
              <span>Diagnóstico em Laboratório</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs" style={{ borderColor: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", backgroundColor: "rgba(139, 92, 246, 0.06)" }}>
              <Wrench className="h-3.5 w-3.5" />
              <span>Reparo de Componentes SMD</span>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {inverters.map((service) => (
              <ServiceCard key={service.id} service={service} variant="inverter" />
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/inverter" className="btn-premium-purple inline-flex items-center gap-2">
              Ver Todos Inverter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Produtos disponíveis */}
      <section className="border-t border-white/5" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-px w-10 rounded" style={{ backgroundColor: "#C9A84C" }} />
                <span className="font-oswald text-[10px] tracking-widest uppercase" style={{ color: "#C9A84C" }}>
                  Loja
                </span>
              </div>
              <h2 className="mt-4 font-bebas text-4xl tracking-widest text-white sm:text-5xl">
                PRODUTOS DISPONÍVEIS
              </h2>
            </div>
            <Link
              href="/produtos"
              className="hidden items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04] hover:text-white sm:inline-flex"
            >
              Ver Todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p: any) => {
                const image = p.images?.[0] || null;
                return (
                  <Link
                    key={p.id}
                    href={`/produto/${p.id}`}
                    className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    style={{
                      background: "rgba(34, 34, 34, 0.45)",
                      backdropFilter: "blur(16px) saturate(140%)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="relative h-[160px] w-full overflow-hidden">
                      {image ? (
                        <img src={image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                          <ShoppingBag className="h-8 w-8" style={{ color: "#444" }} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "#C9A84C" }}>{p.category || "Loja"}</span>
                      <h3 className="mt-1 font-montserrat text-sm font-bold text-white">{p.name}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-oswald text-lg font-bold" style={{ color: "#E30613" }}>
                          R$ {Number(p.price).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[10px]" style={{ color: "#888888" }}>
                          {p.stock > 0 ? `${p.stock} em estoque` : "Indisponível"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-convencional flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full" style={{ backgroundColor: "rgba(201,168,76,0.08)" }} />
                  <p className="mt-4 text-sm" style={{ color: "#888888" }}>Produto em breve</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/5" style={{ backgroundColor: "#161616" }}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "9+", label: "Anos de Experiência" },
              { value: "30+", label: "Tipos de Serviço" },
              { value: "90", label: "Dias de Garantia" },
              { value: "100%", label: "Foco em Qualidade" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-bebas text-4xl tracking-wider text-white sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs tracking-wide uppercase" style={{ color: "#888888" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
