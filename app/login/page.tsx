"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { trigger } = useFloatingWidget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trigger("help");
  }, [trigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
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
