import Link from "next/link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
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
