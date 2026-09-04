"use client";

import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, withTimeout } from "@/lib/supabase";
import { Home, Loader2, Search } from "lucide-react";

export default function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const partnerId = params?.id as string;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthorized(false);
      return;
    }

    const checkAccess = async () => {
      try {
        // Check if user owns this partner via profiles.partner_id
        const { data: profileData } = await withTimeout(
          () => supabase.from("profiles").select("partner_id").eq("id", user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (profileData?.partner_id === partnerId) {
          setAuthorized(true);
          return;
        }

        // Check user_roles
        const { data: roleData } = await withTimeout(
          () => supabase.from("user_roles").select("role, partner_id").eq("user_id", user.id).maybeSingle(),
          5000,
          { data: null, error: null }
        );

        if (roleData?.partner_id === partnerId || roleData?.role === "admin") {
          setAuthorized(true);
          return;
        }

        setAuthorized(false);
      } catch {
        setAuthorized(false);
      }
    };

    checkAccess();
  }, [user, authLoading, partnerId, router]);

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
            <Link
              href="/"
              className="btn-premium-red flex items-center gap-2"
            >
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="pt-[140px] sm:pt-[160px]">
        {children}
      </main>
    </div>
  );
}
