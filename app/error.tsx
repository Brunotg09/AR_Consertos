"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(227,6,19,0.1)" }}
        >
          <AlertTriangle className="h-10 w-10" style={{ color: "#E30613" }} />
        </div>

        <h1 className="font-bebas text-4xl tracking-wide text-white sm:text-5xl">
          ALGO DEU ERRADO
        </h1>
        <p className="mt-3 max-w-md text-sm" style={{ color: "#888888" }}>
          Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="btn-premium-red flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Página inicial
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-[10px]" style={{ color: "#555" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
