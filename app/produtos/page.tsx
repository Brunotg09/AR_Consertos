"use client";

import { supabase } from "@/lib/supabase";
import { productUrl } from "@/lib/slugify";
import { Filter, Loader2, ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  discount_percentage: number | null;
  stock: number;
  condition: string | null;
  images: string[] | null;
  active: boolean;
}

function conditionBadge(condition: string | null) {
  if (!condition) return null;
  const colors: Record<string, string> = {
    novo: "#44dd88",
    usado: "#ffaa44",
    recondicionado: "#8B5CF6",
  };
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `${colors[condition] || "#888"}18`,
        color: colors[condition] || "#888",
        border: `1px solid ${colors[condition] || "#888"}30`,
      }}
    >
      {condition}
    </span>
  );
}

function ProdutosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaAtiva = searchParams.get("categoria") || "Todas";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("id", { ascending: false });
      if (!error && data) setProducts(data as Product[]);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    document.title = "Produtos Disponíveis | A.R Conserto";
    const metaDesc = "Confira os produtos disponíveis na AR Consertos em Itabaiana/SE. Peças e acessórios para conserto de eletrodomésticos.";
    let metaTag = document.querySelector('meta[name="description"]');
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "description");
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", metaDesc);
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products],
  );

  const handleCategoryChange = (cat: string) => {
    if (cat === "Todas") {
      router.push("/produtos");
    } else {
      router.push(`/produtos?categoria=${encodeURIComponent(cat)}`);
    }
  };

  const filtrados =
    categoriaAtiva === "Todas"
      ? products
      : products.filter((p) => p.category === categoriaAtiva);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full px-4 py-12 sm:px-8 lg:px-20">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 rounded" style={{ backgroundColor: "#E30613" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          PRODUTOS
        </h1>
      </div>
      <p className="mt-2 text-sm" style={{ color: "#888888" }}>
        Peças e eletrodomésticos disponíveis na loja AR Consertos
      </p>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#888888" }}>
          <Filter className="h-3.5 w-3.5" />
          <span>Filtrar:</span>
        </div>
        <button
          onClick={() => handleCategoryChange("Todas")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            categoriaAtiva === "Todas"
              ? "text-white"
              : "border border-white/10 text-white/70 hover:bg-white/5"
          }`}
          style={categoriaAtiva === "Todas" ? { backgroundColor: "#E30613" } : undefined}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
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

      {filtrados.length === 0 ? (
        <div className="mt-12 text-center text-sm" style={{ color: "#888888" }}>
          Nenhum produto disponível nesta categoria.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((product) => {
            const image = product.images?.[0] || null;
            const discountPct = product.discount_percentage || 0;
            const discountedPrice = discountPct > 0 ? product.price * (1 - discountPct / 100) : null;
            return (
              <Link
                key={product.id}
                href={productUrl(product.id, product.name)}
                className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{
                  background: "rgba(34, 34, 34, 0.45)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="relative h-[200px] w-full overflow-hidden">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.name}
                      fill
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <ShoppingCart className="h-10 w-10" style={{ color: "#444" }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {conditionBadge(product.condition)}
                </div>

                <div className="p-4">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#C9A84C" }}>
                    {product.category || "Loja"}
                  </span>
                  <h3 className="mt-1 font-montserrat text-sm font-bold text-white">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {discountedPrice ? (
                      <>
                        <span className="font-oswald text-sm line-through" style={{ color: "#666666" }}>
                          R$ {Number(product.price).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="font-oswald text-lg font-bold" style={{ color: "#E30613" }}>
                          R$ {Number(discountedPrice).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="rounded-full bg-[#E30613]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#E30613]">
                          -{discountPct}%
                        </span>
                      </>
                    ) : (
                      <span className="font-oswald text-lg font-bold" style={{ color: "#E30613" }}>
                        R$ {Number(product.price).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: "#888888" }}>
                      {product.stock > 0 ? `${product.stock} em estoque` : "Indisponível"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    }>
      <ProdutosContent />
    </Suspense>
  );
}
