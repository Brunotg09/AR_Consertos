"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { useFloatingWidget } from "@/components/FloatingWidget";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Package,
  Shield,
  Truck,
  Star,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  stock: number;
  condition: string | null;
  images: string[] | null;
}

const conditionConfig: Record<string, { label: string; color: string; bg: string }> = {
  novo: { label: "Novo", color: "#44dd88", bg: "rgba(68,221,136,0.15)" },
  usado: { label: "Usado", color: "#ffaa44", bg: "rgba(255,170,68,0.15)" },
  recondicionado: { label: "Recondicionado", color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
};

export default function ProdutoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { addProduct } = useCart();
  const { trigger } = useFloatingWidget();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    trigger("buy");
  }, [trigger]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", Number(params.id))
        .single();

      if (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } else {
        setProduct(data);
        setImgError(false);
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    addProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || null,
      condition: product.condition,
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/carrinho");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-ar-red" />
          </div>
          <p className="text-sm" style={{ color: "#888888" }}>Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <Package className="mx-auto h-16 w-16" style={{ color: "#444" }} />
          <h1 className="mt-4 font-bebas text-3xl text-white">Produto não encontrado</h1>
          <p className="mt-2 max-w-md text-sm" style={{ color: "#888888" }}>
            O produto solicitado não está disponível ou foi removido de nossa loja.
          </p>
          <button
            onClick={() => router.push("/produtos")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-ar-red px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-105"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Ver todos os produtos
          </button>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const hasStock = product.stock > 0;
  const cond = product.condition ? conditionConfig[product.condition] : null;
  const formattedPrice = Number(product.price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8 lg:space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs" style={{ color: "#666666" }}>
          <button
            onClick={() => router.push("/produtos")}
            className="transition-colors hover:text-white"
          >
            Produtos
          </button>
          <span style={{ color: "#444444" }}>/</span>
          <span className="text-white">{product.name}</span>
        </nav>

        {/* Grid principal */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-12">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              {images.length > 0 ? (
                imgError ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-12 w-12" style={{ color: "#444" }} />
                  </div>
                ) : (
                  <img
                    src={images[currentImage]}
                    alt={`${product.name} — imagem ${currentImage + 1}`}
                    className="h-full w-full object-cover object-center transition-transform duration-500"
                    onError={() => setImgError(true)}
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-12 w-12" style={{ color: "#444" }} />
                </div>
              )}

              {/* Badges flutuantes */}
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {cond && (
                  <span
                    className="rounded-md px-2.5 py-1 font-oswald text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: cond.bg, color: cond.color, border: `1px solid ${cond.color}30` }}
                  >
                    {cond.label}
                  </span>
                )}
                {product.stock < 3 && product.stock > 0 && (
                  <span className="rounded-md bg-[#E30613]/20 px-2.5 py-1 font-oswald text-[10px] font-bold uppercase tracking-wider text-[#E30613]">
                    Últimas unidades
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails / Navigation */}
            {images.length > 1 && (
              <>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all"
                      style={{
                        borderColor: idx === currentImage ? "#E30613" : "rgba(255,255,255,0.1)",
                        opacity: idx === currentImage ? 1 : 0.6,
                      }}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-ar-red hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="flex items-center text-xs" style={{ color: "#666666" }}>
                    {currentImage + 1} / {images.length}
                  </span>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-ar-red hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            {/* Category */}
            <span
              className="inline-block rounded-full px-3 py-1 font-oswald text-[10px] tracking-widest uppercase"
              style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
            >
              {product.category || "Loja"}
            </span>

            {/* Name */}
            <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl lg:text-5xl">
              {product.name}
            </h1>

            {/* Rating placeholder */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" style={{ color: "#C9A84C" }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "#666666" }}>
                4.8 (12 avaliações)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-oswald text-3xl font-bold" style={{ color: "#E30613" }}>
                {formattedPrice}
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Package className="h-5 w-5" style={{ color: hasStock ? "#44dd88" : "#ff6b6b" }} />
              <span className="text-sm font-medium text-white">
                {hasStock ? `${product.stock} unidade(s) em estoque` : "Fora de estoque"}
              </span>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center">
                <Shield className="h-5 w-5" style={{ color: "#44dd88" }} />
                <span className="text-xs" style={{ color: "#aaa" }}>Garantia 90 dias</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center">
                <Truck className="h-5 w-5" style={{ color: "#C9A84C" }} />
                <span className="text-xs" style={{ color: "#aaa" }}>Retirada na loja</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center">
                <Check className="h-5 w-5" style={{ color: "#4ade80" }} />
                <span className="text-xs" style={{ color: "#aaa" }}>Pagamento seguro</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  disabled={!hasStock || added}
                  className="group/btn relative flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-3.5 text-sm font-bold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5" style={{ color: "#44dd88" }} />
                      Adicionado!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                      Adicionar ao Carrinho
                    </>
                  )}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={!hasStock}
                  className="btn-premium-red flex flex-1 items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                >
                  Comprar Agora
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
              <span className="relative inline-block px-3 text-[10px] uppercase tracking-wider" style={{ color: "#444", background: "#111" }}>
                Detalhes
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="mb-2 font-montserrat text-sm font-bold text-white">Descrição</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                {product.description || "Sem descrição disponível para este produto."}
              </p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="block text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>Categoria</span>
                <p className="mt-1 text-sm text-white">{product.category || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="block text-[10px] uppercase tracking-wider" style={{ color: "#666" }}>Condição</span>
                <p className="mt-1 text-sm text-white">{product.condition || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
