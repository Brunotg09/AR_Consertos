import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos e Peças para Eletrodomésticos",
  description:
    "Confira os produtos disponíveis na AR Consertos em Itabaiana/SE. Peças e acessórios para conserto de eletrodomésticos, ar condicionado e eletrônica inverter.",
  alternates: {
    canonical: "https://ar-consertos.vercel.app/produtos",
  },
  openGraph: {
    title: "Produtos e Peças para Eletrodomésticos | AR Consertos",
    description:
      "Peças e acessórios para conserto de eletrodomésticos em Itabaiana/SE. Garantia e entrega rápida.",
    url: "https://ar-consertos.vercel.app/produtos",
    siteName: "AR Consertos",
    locale: "pt_BR",
    type: "website",
  },
};

export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
