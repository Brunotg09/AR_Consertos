/**
 * Centralized slug generation for SEO-friendly URLs
 * Format: /servico/{category-slug}/{service_id}
 * Example: /servico/eletronica/tv-123
 */

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryToSlug(category: string): string {
  return toSlug(category);
}

/**
 * Generate full service URL using service_id
 * Format: /servico/{category}/{service_id}
 */
export function serviceUrl(category: string, _name: string, _description?: string, serviceId?: string): string {
  const catSlug = categoryToSlug(category);
  const sid = serviceId || toSlug(_name);
  return `/servico/${catSlug}/${sid}`;
}

/**
 * Category display names mapping
 */
export const categoryDisplayNames: Record<string, string> = {
  "linha-branca": "Linha Branca",
  "pequenos-eletrodomesticos": "Pequenos Eletrodomésticos",
  "climatizacao": "Climatização",
  "ferramentas-e-equipamentos": "Ferramentas e Equipamentos",
  "entretenimento-e-mobilidade": "Entretenimento e Mobilidade",
  "eletronica-avancada-inverter": "Eletrônica Avançada Inverter",
  "eletronica": "Eletrônica",
};
