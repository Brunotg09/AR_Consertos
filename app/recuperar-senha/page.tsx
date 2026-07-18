"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/minha-conta`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <CheckCircle className="mx-auto h-12 w-12" style={{ color: "#44dd88" }} />
        <h2 className="mt-4 font-bebas text-3xl tracking-widest text-white">
          E-MAIL ENVIADO
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
        </p>
        <Link
          href="/login"
          className="btn-premium-red mt-8 inline-flex items-center gap-2"
        >
          Voltar para Login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-bebas text-4xl tracking-widest text-white">
          RECUPERAR SENHA
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Enviaremos um link para redefinir sua senha
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
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
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-premium-red flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar Link"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="text-center text-xs" style={{ color: "#888888" }}>
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
