"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, withTimeout } from "@/lib/supabase";
import {
  LayoutDashboard,
  Bell,
  Wrench,
  Wallet,
  Settings,
  Home,
  Loader2,
  Search,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  LogOut,
} from "lucide-react";
import { usePartnerNotifications } from "@/hooks/usePartnerNotifications";
import { usePartner } from "@/hooks/usePartners";
import { cn } from "@/lib/utils";

const portalNav = [
  { href: "/parceiro/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parceiro/ofertas", label: "Ofertas", icon: Bell },
  { href: "/parceiro/servicos", label: "Serviços", icon: Wrench },
  { href: "/parceiro/faturamento", label: "Faturamento", icon: Wallet },
  { href: "/parceiro/configuracoes", label: "Configurações", icon: Settings },
];

export default function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { partner } = usePartner();
  const { unreadCount } = usePartnerNotifications();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthorized(false);
      return;
    }

    const checkAccess = async () => {
      try {
        const { data: partnerData } = await withTimeout(
          () => supabase.from("partners").select("id, active").eq("user_id", user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (partnerData && partnerData.active !== false) {
          setAuthorized(true);
          return;
        }

        const { data: profileData } = await withTimeout(
          () => supabase.from("profiles").select("partner_id").eq("id", user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (profileData?.partner_id) {
          setAuthorized(true);
          return;
        }

        const { data: roleData } = await withTimeout(
          () => supabase.from("user_roles").select("role, partner_id").eq("user_id", user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (roleData?.partner_id || roleData?.role === "admin") {
          setAuthorized(true);
          return;
        }

        setAuthorized(false);
      } catch {
        setAuthorized(false);
      }
    };

    checkAccess();
  }, [user, authLoading]);

  useEffect(() => {
    if (authorized && window.location.pathname === "/parceiro") {
      router.replace("/parceiro/dashboard");
    }
  }, [authorized, router]);

  if (authLoading || authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(201,168,76,0.1)" }}
          >
            <span className="font-bebas text-4xl" style={{ color: "#C9A84C" }}>
              404
            </span>
          </div>
          <h1 className="font-bebas text-4xl tracking-wide text-white sm:text-5xl">
            PÁGINA NÃO ENCONTRADA
          </h1>
          <p className="mt-3 max-w-md text-sm" style={{ color: "#888888" }}>
            O endereço que você procura não existe ou foi movido para outro local.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/" className="btn-premium-red flex items-center gap-2">
              <Home className="h-4 w-4" />
              Página inicial
            </Link>
            <Link
              href="/servicos"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]"
            >
              <Search className="h-4 w-4" />
              Ver serviços
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = portalNav.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Profile */}
        <div className="flex flex-col items-center gap-4 p-6 border-b border-white/10 flex-shrink-0">
          <Link href="/parceiro/dashboard">
            {partner?.photo_url ? (
              <img
                src={partner.photo_url}
                alt={partner.full_name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-[#C9A84C]/50"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C9A84C]/10 font-bebas text-3xl text-[#C9A84C] ring-2 ring-[#C9A84C]/50">
                {partner?.full_name?.charAt(0).toUpperCase() || "P"}
              </div>
            )}
          </Link>
          <div className="w-full text-center">
            <Link href="/parceiro/dashboard" className="block">
              <h3 className="font-bebas text-xl tracking-wide text-white truncate">
                {partner?.full_name || "Parceiro"}
              </h3>
            </Link>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              {partner?.categories?.map((cat: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-medium text-[#C9A84C]"
                >
                  {cat}
                </span>
              ))}
            </div>
            {partner?.average_rating != null && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 text-[#C9A84C]" />
                <span className="text-xs font-medium text-white/80">
                  {Number(partner.average_rating).toFixed(1)}
                </span>
                <span className="text-[10px] text-white/40">({partner.total_ratings || 0})</span>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Menu do parceiro">
          {portalNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#C9A84C]/10 text-[#C9A84C]"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-[#C9A84C]")} />
                <span className="truncate">{item.label}</span>
                {item.href === "/parceiro/ofertas" && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E30613] px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.04] hover:text-white transition-all"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {/* Portal topbar (sticky) */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            {/* Left: mobile menu + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden rounded-lg bg-white/[0.04] p-2 text-white/70 hover:bg-white/[0.08]"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/parceiro/dashboard" className="hidden lg:flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                <Home className="h-4 w-4" />
                <span className="text-sm">Parceiro</span>
              </Link>
              {currentPage && (
                <>
                  <ChevronRight className="hidden lg:block h-4 w-4 text-white/30" />
                  <span className="truncate text-sm font-medium text-white">{currentPage.label}</span>
                </>
              )}
            </div>

            {/* Right: notifications + site link */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#E30613] px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <Link
                href="/"
                className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.04] hover:text-white transition-all"
              >
                <Search className="h-3.5 w-3.5" />
                Ver site
              </Link>
            </div>
          </div>
        </header>

        {/* Main content - only this scrolls */}
        <main className="flex-1 px-4 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Mobile FAB */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full bg-[#E30613] p-3 shadow-lg transition-transform hover:scale-105"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}