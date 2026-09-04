"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_private")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return !error && !!data;
}

export default function PrivateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = await checkIsAdmin(session.user.id);
        if (isAdmin) {
          router.push("/private/dashboard");
        }
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const isAdmin = session?.user ? await checkIsAdmin(session.user.id) : false;

      if (!isAdmin) {
        const { fullLogout } = await import("@/lib/logout");
        await fullLogout();
        setError("Acesso negado. Você não tem permissão de administrador.");
        setLoading(false);
        return;
      }

      router.push("/private/dashboard");
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/" className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2" style={{ borderColor: "#C9A84C" }}>
              <Image
                src="/logo_ArConsertos.webp"
                alt="AR Consertos"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </Link>
            <h1 className="font-montserrat text-xl font-bold text-white">
              Acesso Administrativo
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Entre com suas credenciais de administrador
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#E30613]/20 bg-[#E30613]/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E30613]" />
                <p className="text-sm text-[#E30613]">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-white/70">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@arconsertos.com"
                required
                className="rounded-xl border-white/10 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-[#E30613]/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white/70">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-[#E30613]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-white/40">
            Acesso restrito a administradores.
          </div>
        </div>
      </div>
    </div>
  );
}
