import { supabase } from "@/lib/supabase";
import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Produtos Disponíveis',
  description:
    'Confira os produtos disponíveis na AR Consertos em Itabaiana/SE. Peças e acessórios para conserto de eletrodomésticos.',
  alternates: {
    canonical: 'https://ar-consertos.vercel.app/produtos',
  },
};

interface Product {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  stock: number;
  condition: string | null;
  images: string[] | null;
  active: boolean;
}

export const dynamic = "force-dynamic";

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false });
  if (error || !data) return [];
  return data as Product[];
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

export default async function ProdutosPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto  max-w-full px-4 py-12 sm:px-8 lg:px-20">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 rounded" style={{ backgroundColor: "#E30613" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          PRODUTOS
        </h1>
      </div>
      <p className="mt-2 text-sm" style={{ color: "#888888" }}>
        Peças e eletrodomésticos disponíveis na loja AR Consertos
      </p>

      {products.length === 0 ? (
        <div className="mt-12 text-center text-sm" style={{ color: "#888888" }}>
          Nenhum produto disponível no momento.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const image = product.images?.[0] || null;
            return (
              <Link
                key={product.id}
                href={`/produto/${product.id}`}
                className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{
                  background: "rgba(34, 34, 34, 0.45)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {/* Imagem */}
                <div className="relative h-[200px] w-full overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <ShoppingCart className="h-10 w-10" style={{ color: "#444" }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {conditionBadge(product.condition)}
                </div>

                {/* Info */}
                <div className="p-4">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "#C9A84C" }}>
                    {product.category || "Loja"}
                  </span>
                  <h3 className="mt-1 font-montserrat text-sm font-bold text-white">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-oswald text-lg font-bold" style={{ color: "#E30613" }}>
                      R$ {Number(product.price).toFixed(2).replace(".", ",")}
                    </span>
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
