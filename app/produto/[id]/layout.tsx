import type { Metadata } from "next";
import { getProductSeo } from "@/lib/seo";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seo = await getProductSeo(Number(params.id));

  if (!seo) {
    return {
      title: "Produto",
      description:
        "Confira os produtos disponíveis na AR Consertos em Itabaiana/SE.",
    };
  }

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.canonical,
      siteName: "AR Consertos",
      locale: "pt_BR",
      type: "website",
      ...(seo.image
        ? { images: [{ url: seo.image, alt: seo.title }] }
        : {}),
    },
  };
}

export default function ProdutoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
