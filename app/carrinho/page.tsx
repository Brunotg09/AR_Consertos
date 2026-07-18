"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ServiceIcon } from "@/components/ServiceIcon";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Package,
  Wrench,
  AlertTriangle,
} from "lucide-react";

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, removeItem, updateProductQuantity, subtotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/carrinho");
    }
  }, [user, authLoading, router]);

  const handleCheckout = () => {
    router.push("/checkout");
  };

  // Show loading or nothing while checking auth
  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-6 w-6" style={{ color: "#C9A84C" }} />
        <h1 className="font-bebas text-3xl tracking-wide text-white sm:text-4xl">
          CARRINHO
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12" style={{ color: "#444" }} />
          <p className="mt-4 text-sm" style={{ color: "#888888" }}>
            Seu carrinho está vazio.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/produtos" className="btn-premium-red flex items-center gap-2">
              Ver Produtos
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/servicos" className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]">
              <Wrench className="h-4 w-4" />
              Serviços
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {items.map((item) => {
              if (item.type === "service") {
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "rgba(227,6,19,0.08)", border: "1px solid rgba(227,6,19,0.15)" }}
                    >
                      <ServiceIcon
                        iconName={item.service.iconName}
                        className="h-5 w-5"
                        style={{ color: "#E30613" }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-montserrat text-sm font-bold text-white">
                          {item.service.name}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: "#E3061320", color: "#E30613" }}
                        >
                          Serviço
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "#888888" }}>
                        {item.service.description}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/[0.04]"
                      style={{ color: "#ff6b6b" }}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-5 w-5" style={{ color: "#444" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-montserrat text-sm font-bold text-white">
                        {item.name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: "#C9A84C20", color: "#C9A84C" }}
                      >
                        Produto
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateProductQuantity(item.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-all hover:bg-white/[0.04]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-all hover:bg-white/[0.04]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-oswald text-sm font-bold" style={{ color: "#E30613" }}>
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/[0.04]"
                    style={{ color: "#ff6b6b" }}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#888888" }}>Subtotal</span>
              <span className="font-oswald text-xl font-bold text-white">
                R$ {subtotal.toFixed(2).replace(".", ",")}
              </span>
            </div>
            {!user && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: "#E3061340", backgroundColor: "#E3061310", color: "#ff6b6b" }}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Você precisa estar logado para finalizar. Seu carrinho será mantido.</span>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={clearCart}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]"
              >
                <Trash2 className="h-4 w-4" />
                Limpar
              </button>
              <button
                onClick={handleCheckout}
                className="btn-premium-red flex flex-1 items-center justify-center gap-2"
              >
                Finalizar Pedido
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
