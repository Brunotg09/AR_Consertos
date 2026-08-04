"use client";

import { useEffect, useState } from "react";
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

export default function ProdutoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { addProduct } = useCart();
  const { trigger } = useFloatingWidget();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trigger("buy");
  }, [trigger]);
  const [currentImage, setCurrentImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", Number(params.id))
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [params.id]);

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
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-ar-red" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-white">Produto não encontrado.</p>
      </div>
    );
  }

  const images = product.images || [];
  const hasStock = product.stock > 0;

  const conditionColors: Record<string, string> = {
    novo: "#44dd88",
    usado: "#ffaa44",
    recondicionado: "#8B5CF6",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="relative h-[320px] overflow-hidden rounded-2xl sm:h-[400px]" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
            {images.length > 0 ? (
              <img
                src={images[currentImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-16 w-16" style={{ color: "#444" }} />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className="h-16 w-16 overflow-hidden rounded-lg border-2 transition-all"
                  style={{
                    borderColor: idx === currentImage ? "#E30613" : "rgba(255,255,255,0.1)",
                    opacity: idx === currentImage ? 1 : 0.5,
                  }}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "#C9A84C" }}>
            {product.category || "Loja"}
          </span>
          <h1 className="mt-2 font-bebas text-3xl tracking-wide text-white">
            {product.name}
          </h1>
          {product.condition && (
            <span
              className="mt-2 inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${conditionColors[product.condition] || "#888"}18`,
                color: conditionColors[product.condition] || "#888",
                border: `1px solid ${conditionColors[product.condition] || "#888"}30`,
              }}
            >
              {product.condition}
            </span>
          )}

          <div className="mt-6">
            <span className="font-oswald text-3xl font-bold" style={{ color: "#E30613" }}>
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>
            {product.description || "Sem descrição disponível."}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#888888" }}>
            <Package className="h-4 w-4" />
            {hasStock ? (
              <span>{product.stock} unidade(s) em estoque</span>
            ) : (
              <span style={{ color: "#ff6b6b" }}>Fora de estoque</span>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAddToCart}
              disabled={!hasStock || added}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" style={{ color: "#44dd88" }} />
                  Adicionado!
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar ao Carrinho
                </>
              )}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!hasStock}
              className="btn-premium-red flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
            >
              Comprar Agora
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
