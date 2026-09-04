"use client";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import { buildSearchUrl } from "@/lib/searchUrl";
import { serviceUrl } from "@/lib/slugify";
import {
  Award,
  Banknote,
  Building2,
  Cpu,
  CreditCard,
  History,
  Home,
  Instagram,
  LogOut,
  Mail,
  Menu,
  Phone,
  QrCode,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const publicNavLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/servicos", label: "Serviços Gerais", icon: Wrench },
  { href: "/inverter", label: "Eletrônica Inverter", icon: Cpu },
  { href: "/servicos-parceiros", label: "Serviços Parceiros", icon: Users },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "#", label: "Promoções", icon: Tag },
  { href: "/contato", label: "Contato", icon: Mail },
];

const authNavLinks = [
  { href: "/minha-conta", label: "Minha Conta", icon: User },
  { href: "/historico", label: "Histórico", icon: History },
];

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const { user, isAdmin, userRole, partnerId, signOut } = useAuth();
  const { totalItems } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const handleSignOut = async () => {
    await signOut();
    setDrawerOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : ""
        }`}
        style={{
          backgroundColor: scrolled ? "rgba(26,26,26,0.88)" : "#1a1a1a",
          backdropFilter: scrolled ? "blur(20px) saturate(140%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(140%)" : "none",
        }}
      >
        {/* Noise texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />

        {/* Linha principal */}
        <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Esquerda: logo com imagem */}
            <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div
                className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[2.5px] transition-all duration-300 hover:scale-105 sm:h-16 sm:w-16"
                style={{
                  borderColor: "#C9A84C",
                  boxShadow: "0 0 20px rgba(201,168,76,0.25), 0 0 40px rgba(201,168,76,0.1), inset 0 0 12px rgba(201,168,76,0.08)",
                }}
              >
                <Image
                  src="/logo_ArConsertos.webp"
                  alt="AR Consertos"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <span
                className="hidden font-oswald text-[14px] tracking-[0.2em] sm:block"
                style={{ color: "#888888" }}
              >
                DESDE 2017
              </span>
            </Link>

            {/* Centro: branding */}
            <div className="flex min-w-0 flex-1 flex-col items-center px-2 sm:px-4">
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span
                  className="truncate font-montserrat text-lg font-black tracking-tight sm:text-4xl"
                 
                >
                  A.R
                </span>
                <span className="truncate font-montserrat text-lg font-black tracking-tight text-white sm:text-4xl">
                  CONSERTO
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span
                  className="hidden font-inter text-[12px] italic sm:block"
                  style={{ color: "#888888" }}
                >
                  TÉCNICO
                </span>
                <span className="text-gradient-gold hidden font-montserrat text-[12px] font-bold tracking-wide sm:block">
                  ELETRODOMÉSTICOS
                </span>
                <span
                  className="hidden rounded px-1.5 py-0.5 font-oswald text-[10px] tracking-wider text-white sm:block"
                  style={{ backgroundColor: "#8B5CF6" }}
                >
                  INVERTER
                </span>
              </div>
            </div>

            {/* Direita: busca + carrinho + hambúrguer */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 sm:h-10 sm:w-10"
                style={{
                  background: "linear-gradient(135deg, rgba(60,60,60,0.6) 0%, rgba(20,20,20,0.8) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
                aria-label="Buscar"
              >
                <Search className="h-4 w-4 text-white" />
              </button>

              {/* Cart */}
              <Link
                href="/carrinho"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 sm:h-10 sm:w-10"
                style={{
                  background: "linear-gradient(135deg, rgba(60,60,60,0.6) 0%, rgba(20,20,20,0.8) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <ShoppingCart className="h-4 w-4 text-white" />
                {mounted && totalItems > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ backgroundColor: "#E30613" }}
                  >
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Hambúrguer */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 sm:h-10 sm:w-10"
                style={{
                  background: "linear-gradient(135deg, rgba(60,60,60,0.6) 0%, rgba(20,20,20,0.8) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(227,6,19,0.25), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(227,6,19,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Gradient divider */}
        <div
          className="relative h-[1px] w-full"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #E30613 20%, #8B5CF6 50%, #C9A84C 80%, transparent 100%)",
            opacity: 0.5,
          }}
        />

        {/* Barra de informações em chips */}
        <div
          className="relative overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: "rgba(20,20,20,0.6)",
            maxHeight: scrolled ? "0" : "60px",
            opacity: scrolled ? 0 : 1,
          }}
        >
          <div className="mx-auto flex items-center justify-center gap-1.5 overflow-x-auto px-4 py-1.5 sm:justify-between sm:flex-wrap sm:gap-2">
            {/* Garantia - chip dourado */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] md:text-xs"
              style={{
                backgroundColor: "rgba(201, 168, 76, 0.08)",
                border: "1px solid rgba(201, 168, 76, 0.15)",
                color: "#C9A84C",
              }}
            >
              <Award className="h-3 w-3" />
              <span className="font-oswald tracking-wider">GARANTIA DE 90 DIAS</span>
            </div>

            {/* Telefone - chip vermelho */}
            <a
              href="tel:+5579999446596"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] transition-all duration-200 hover:scale-105 sm:text-[10px] md:text-xs"
              target="_blank"
              style={{
                backgroundColor: "rgba(227, 6, 19, 0.08)",
                border: "1px solid rgba(227, 6, 19, 0.15)",
                color: "#ff6b6b",
              }}
            >
              <Phone className="h-3 w-3" />
              <span className="hidden sm:inline">(79) 99944-6596</span>
            </a>

            {/* Instagram - chip roxo */}
            
            <a
            href="https://instagram.com/A.RCONSERTOS"
            target="_blank"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] md:text-xs"
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.15)",
                color: "#a78bfa",
              }}
            >
              <Instagram className="h-3 w-3" />
              <span>@A.RCONSERTOS</span>
            </a>

            {/* Pagamento - chip neutro */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] md:text-xs"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#888888",
              }}
            >
              <CreditCard className="h-3 w-3" />
              <Banknote className="h-3 w-3" />
              <QrCode className="h-3 w-3" />
              <span className="hidden sm:inline">Cartão / PIX / Dinheiro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <SearchOverlay query={searchQuery} setQuery={setSearchQuery} onClose={() => setSearchOpen(false)} />
      )}

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed right-0 top-0 z-[70] h-full w-80 max-w-full transform transition-transform duration-300 ease-out shadow-2xl"
            style={{
              backgroundColor: "rgba(26, 26, 26, 0.92)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
              <span className="font-montserrat text-lg font-bold text-white tracking-tight">
                Menu
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <nav className="p-5">
              {/* Public links */}
              <ul className="space-y-1">
                {publicNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                      >
                        <Icon className="h-4 w-4" style={{ color: "#C9A84C" }} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Auth section */}
              {user ? (
                <>
                  <div className="my-4 border-t border-white/[0.06]" />
                  <ul className="space-y-1">
                    {authNavLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <li key={link.href + link.label}>
                          <Link
                            href={link.href}
                            onClick={() => setDrawerOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                          >
                            <Icon className="h-4 w-4" style={{ color: "#8B5CF6" }} />
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                    {isAdmin && (
                      <li>
                        <Link
                          href="/private/dashboard"
                          onClick={() => setDrawerOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                        >
                          <Settings className="h-4 w-4" style={{ color: "#E30613" }} />
                          Painel Admin
                        </Link>
                      </li>
                    )}
                    {partnerId && (
                      <li>
                        <Link
                          href={`/parceiro/${partnerId}`}
                          onClick={() => setDrawerOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
                        >
                          <Building2 className="h-4 w-4" style={{ color: "#C9A84C" }} />
                          Painel Parceiro
                        </Link>
                      </li>
                    )}
                  </ul>
                  <div className="mt-6">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04] hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-6 border-t border-white/[0.06] pt-6">
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="btn-premium-red flex w-full items-center justify-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Entrar / Cadastrar
                  </Link>
                </div>
              )}
            </nav>
           </div>
        </>
      )}
    </>
  );
}

function SearchOverlay({ query, setQuery, onClose }: { query: string; setQuery: (v: string) => void; onClose: () => void }) {
  const { services } = useServices({ activeOnly: true });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
    );
  }, [query, services]);

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed left-0 right-0 top-0 z-[90] max-h-[85vh] overflow-y-auto p-4">
        <div
          className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] shadow-2xl"
          style={{
            backgroundColor: "rgba(26,26,26,0.97)",
            backdropFilter: "blur(24px) saturate(150%)",
          }}
        >
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar serviços, produtos..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 outline-none focus:border-ar-red/50"
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#888888" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!query.trim() && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[10px]" style={{ color: "#666666" }}>Sugestões:</span>
                {["Máquina de Lavar", "Geladeira", "Air Fryer", "Ar Condicionado"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-white/[0.06] px-2.5 py-1 text-[10px] text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/80"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {query.trim() && results.length > 0 && (
            <div className="border-t border-white/[0.06] p-4">
              <div className="mb-3 text-[10px]" style={{ color: "#888888" }}>
                {results.length} resultado(s)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.slice(0, 6).map((service) => {
                  const seoUrl = serviceUrl(service.category || "", service.name, undefined, service.service_id || String(service.id));
                  return (
                    <Link
                      key={service.id}
                      href={seoUrl}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-white/[0.04]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(227,6,19,0.1)" }}>
                        <Wrench className="h-5 w-5" style={{ color: "#E30613" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{service.name}</div>
                        <div className="truncate text-[10px]" style={{ color: "#888888" }}>{service.category}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {results.length > 6 && (
                <Link
                  href={buildSearchUrl(window.location.origin, query)}
                  onClick={onClose}
                  className="mt-3 block text-center text-xs text-ar-red hover:underline"
                >
                  Ver todos os {results.length} resultados
                </Link>
              )}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="border-t border-white/[0.06] p-6 text-center">
              <Search className="mx-auto h-8 w-8" style={{ color: "#444" }} />
              <p className="mt-2 text-sm" style={{ color: "#888888" }}>
                Nenhum resultado para &quot;{query}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
