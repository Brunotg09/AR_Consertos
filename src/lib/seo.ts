import { createServerSupabase } from "@/lib/supabase-server";
import { productUrl } from "@/lib/slugify";

const SITE_URL = "https://ar-consertos.vercel.app";
const SITE_NAME = "A.R Conserto";

export interface ProductSeo {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  jsonLd: Record<string, unknown> | null;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Busca os dados de um produto no servidor para gerar <title>,
 * <meta description>, canonical e JSON-LD direto no HTML inicial
 * (o que os robôs do Google leem antes de executar o JavaScript).
 */
export async function getProductSeo(id: number): Promise<ProductSeo | null> {
  if (!Number.isFinite(id) || id <= 0) return null;

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("products")
      .select("id, name, description, category, price, discount_percentage, stock, images")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle();

    if (!data) return null;

    const title = `${data.name} | ${SITE_NAME} - Loja`;
    const description = (
      data.description
        ? `${data.name}: ${data.description} Confira preço e disponibilidade!`
        : `${data.name} - ${data.category || "Produto"} disponível na ${SITE_NAME}. Confira!`
    ).substring(0, 160);

    const image: string | null = data.images?.[0] ?? null;
    const finalPrice =
      data.price * (1 - (data.discount_percentage || 0) / 100);

    return {
      title,
      description,
      canonical: `${SITE_URL}${productUrl(data.id, data.name)}`,
      image,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: data.name,
        description: data.description || undefined,
        image: image || undefined,
        sku: String(data.id),
        brand: { "@type": "Brand", name: SITE_NAME },
        offers: {
          "@type": "Offer",
          price: finalPrice.toFixed(2),
          priceCurrency: "BRL",
          availability:
            data.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: `${SITE_URL}${productUrl(data.id, data.name)}`,
        },
      },
    };
  } catch {
    return null;
  }
}

export interface ServiceSeo {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
}

/**
 * Gera metadados server-side para /servico/{categoria}/{service_id}
 * (com fallbacks para os formatos legados de URL).
 */
export async function getServiceSeo(slug: string[]): Promise<ServiceSeo | null> {
  if (!slug || slug.length === 0) return null;

  try {
    const supabase = createServerSupabase();
    let service: {
      name: string;
      description: string | null;
      category: string;
      service_id: string;
      images: string[] | null;
    } | null = null;

    if (slug.length >= 2) {
      // Formato atual: /servico/{categoria}/{service_id}
      const { data } = await supabase
        .from("services")
        .select("name, description, category, service_id, images")
        .eq("service_id", slug[slug.length - 1])
        .eq("active", true)
        .maybeSingle();
      service = data;
    }

    if (!service) {
      // Legado: /servico/{id} ou /servico/{service_id}
      const numericId = parseInt(slug[0], 10);
      if (!Number.isNaN(numericId) && numericId > 0) {
        const { data } = await supabase
          .from("services")
          .select("name, description, category, service_id, images")
          .eq("id", numericId)
          .eq("active", true)
          .maybeSingle();
        service = data;
      }
      if (!service) {
        const { data } = await supabase
          .from("services")
          .select("name, description, category, service_id, images")
          .eq("service_id", slug[0])
          .eq("active", true)
          .maybeSingle();
        service = data;
      }
    }

    if (!service) return null;

    const title = `${service.name} | ${SITE_NAME} - Conserto com Garantia`;
    const description = (
      service.description
        ? `${service.name}: ${service.description} Garantia de 90 dias. Agende agora!`
        : `${service.name} - Conserto especializado com garantia de 90 dias em Itabaiana/SE. ${SITE_NAME}`
    ).substring(0, 160);

    const catSlug = service.category
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const sid = service.service_id || catSlug;

    return {
      title,
      description,
      canonical: `${SITE_URL}/servico/${catSlug}/${sid}`,
      image: service.images?.[0] ?? null,
    };
  } catch {
    return null;
  }
}
