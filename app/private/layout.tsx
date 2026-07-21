"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wrench,
  ImageIcon,
  FileText,
  MessageCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { supabase, getSessionSafe, withTimeout } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

const adminNavLinks: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean; badge?: boolean }[] = [
  { href: "/private/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/private/chat", label: "Chat", icon: MessageCircle, badge: true },
  { href: "/private/estoque", label: "Estoque", icon: Package },
  { href: "/private/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/private/clientes", label: "Clientes", icon: Users },
  { href: "/private/servicos", label: "Serviços", icon: Wrench },
  { href: "/private/banners", label: "Banners", icon: ImageIcon },
  { href: "/private/relatorios", label: "Relatórios", icon: FileText },
];

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [waitingChatCount, setWaitingChatCount] = useState(0);

  const isLoginPage = pathname === "/private/login";

  // Fetch waiting chat count (realtime)
  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    const fetchWaitingCount = async () => {
      try {
        const { count } = await withTimeout(
          () => supabase
            .from("chat_sessions")
            .select("*", { count: "exact", head: true })
            .eq("status", "aguardando_admin"),
          8000,
          { data: null, error: null, count: 0 }
        );
        if (!cancelled) setWaitingChatCount(count || 0);
      } catch {
        if (!cancelled) setWaitingChatCount(0);
      }
    };

    fetchWaitingCount();

    // Subscribe to changes for instant updates
    const channel = supabase
      .channel("admin-waiting-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => {
          if (!cancelled) fetchWaitingCount();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkAdmin = async () => {
      try {
        const { data: { session } } = await getSessionSafe();
        if (cancelled) return;

        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(session.user);

        const { data: adminData } = await withTimeout(
          () => supabase.from("user_private").select("id").eq("id", session.user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (cancelled) return;

        setIsAdmin(!!adminData);
      } catch (e) {
        console.error("[admin] checkAdmin error:", e);
        setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
          <span className="text-sm text-white/50">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-white/50">Acesso não autorizado.</p>
          <Link href="/" className="text-sm text-[#E30613] hover:underline">
            Voltar para o site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f0f0f] border border-white/[0.06] transition-colors hover:bg-white/[0.08]"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-white/[0.06] bg-[#0f0f0f] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2" style={{ borderColor: "#C9A84C" }}>
                <Image
                  src="/logo_ArConsertos.webp"
                  alt="AR Consertos"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="block text-sm font-bold text-white leading-tight">Painel Admin</span>
                <span className="text-[10px] text-white/40">AR Consertos</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {adminNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                const isDisabled = link.disabled;
                const badgeCount = link.badge ? waitingChatCount : 0;

                return (
                  <li key={link.href}>
                    <Link
                      href={isDisabled ? "#" : link.href}
                      onClick={(e) => {
                        if (isDisabled) e.preventDefault();
                        else setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isDisabled
                          ? "cursor-not-allowed text-white/30"
                          : isActive
                          ? "bg-[#E30613]/10 text-[#E30613]"
                          : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E30613] px-1.5 text-[10px] font-bold text-white animate-pulse">
                          {badgeCount}
                        </span>
                      )}
                      {isDisabled && (
                        <span className="ml-auto text-[10px] text-white/30">Em breve</span>
                      )}
                      {isActive && !badgeCount && (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-white/[0.06] p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E30613]/20">
                <span className="text-xs font-bold text-[#E30613]">
                  {user?.email?.[0].toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-white/40">Administrador</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72">
        <div className="p-4 pt-16 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
