import type { MetadataRoute } from 'next';
import { createServerSupabase } from '@/lib/supabase-server';
import { productUrl } from '@/lib/slugify';

const baseUrl = 'https://ar-consertos.vercel.app';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/servicos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/inverter`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/produtos`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/contato`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/politica-de-privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/termos-de-uso`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let entries: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerSupabase();
    const [{ data: services }, { data: products }] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, category, type, service_id')
        .eq('active', true),
      supabase
        .from('products')
        .select('id, name')
        .eq('active', true),
    ]);

    if (services) {
      const servicePages: MetadataRoute.Sitemap = services.map((service) => {
        const catSlug = toSlug(service.category);
        const serviceSlug = service.service_id || toSlug(service.name);
        return {
          url: `${baseUrl}/servico/${catSlug}/${serviceSlug}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      });
      entries = [...entries, ...servicePages];
    }

    if (products) {
      const productPages: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${baseUrl}${productUrl(product.id, product.name)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
      entries = [...entries, ...productPages];
    }
  } catch (error) {
  }

  return [...staticPages, ...entries];
}
