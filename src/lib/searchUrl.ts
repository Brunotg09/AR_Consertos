import { toSlug } from "./slugify";

export interface SearchFilters {
  [key: string]: string | number | boolean | string[] | undefined | null;
}

export interface ParsedSearch {
  term: string;
  filters: Record<string, string>;
}

const RESERVED_KEYS = ["page", "sort", "order"];

function cleanFilters(filters: SearchFilters): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      cleaned[key] = value.join(",");
      continue;
    }

    if (typeof value === "boolean") {
      cleaned[key] = value ? "1" : "0";
      continue;
    }

    cleaned[key] = String(value);
  }

  return cleaned;
}

export function buildSearchUrl(
  baseUrl: string,
  term: string,
  filters: SearchFilters = {}
): string {
  const slug = toSlug(term);
  const cleaned = cleanFilters(filters);

  const url = new URL(`${baseUrl}/busca/${slug}`, baseUrl);

  for (const [key, value] of Object.entries(cleaned)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}

export function slugToDisplay(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseSearchUrl(
  pathname: string,
  searchParams: Record<string, string>
): ParsedSearch {
  const segments = pathname.split("/").filter(Boolean);
  const buscaIndex = segments.indexOf("busca");

  let term = "";
  if (buscaIndex !== -1 && segments[buscaIndex + 1]) {
    term = slugToDisplay(segments[buscaIndex + 1]);
  }

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "q") {
      term = value;
      continue;
    }
    filters[key] = value;
  }

  return { term, filters };
}
