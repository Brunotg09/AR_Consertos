"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.includes("://")
      ? rawRedirect
      : "/";
  const { trigger } = useFloatingWidget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    trigger("help");
  }, [trigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("E-mail ou senha incorretos.");
      return;
    }

    // Clear 2FA verification on new login
    await supabase
      .from("profiles")
      .update({ two_fa_verified_at: null })
      .eq("id", signInData.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email_2fa_enabled")
      .eq("id", signInData.user.id)
      .single();

    setLoading(false);

    if (profile?.email_2fa_enabled) {
      router.push(`/auth/verificar-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (googleError) {
      setGoogleLoading(false);
      setError("Erro ao conectar com Google. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-bebas text-4xl tracking-widest text-white">
          ENTRAR
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Acesse sua conta na AR Consertos
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-5"
      >
        {error && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#E3061340", backgroundColor: "#E3061310", color: "#ff6b6b" }}>
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#888888" }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/recuperar-senha"
            className="text-xs transition-colors hover:text-white"
            style={{ color: "#888888" }}
          >
            Esqueci minha senha
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-premium-red flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Divisor */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
          <span className="mx-4 text-xs" style={{ color: "#888888" }}>ou</span>
          <div className="flex-grow" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
        </div>

        {/* Botão Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Conectando..." : "Continuar com Google"}
        </button>

        <div className="text-center text-xs" style={{ color: "#888888" }}>
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-white hover:underline"
          >
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
