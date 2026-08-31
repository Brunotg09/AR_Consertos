import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

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
  ];

  try {
    const { data: services } = await supabase
      .from('services')
      .select('id, name, category, type, service_id')
      .eq('active', true);

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
      return [...staticPages, ...servicePages];
    }
  } catch (error) {
    console.error('Error fetching services for sitemap:', error);
  }

  return staticPages;
}
