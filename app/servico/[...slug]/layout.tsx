import type { Metadata } from "next";
import { getServiceSeo } from "@/lib/seo";

interface Props {
  params: { slug: string[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seo = await getServiceSeo(params.slug);

  if (!seo) {
    return {
      title: "Serviço de Conserto",
      description:
        "Conserto de eletrodomésticos com garantia de 90 dias em Itabaiana/SE pela AR Consertos.",
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

export default function ServicoSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
