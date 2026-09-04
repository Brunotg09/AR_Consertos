"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  buildSearchUrl,
  parseSearchUrl,
  type SearchFilters,
  type ParsedSearch,
} from "@/lib/searchUrl";

interface UseSearchUrlReturn {
  buildUrl: (term: string, filters?: SearchFilters) => string;
  currentSearch: ParsedSearch;
  navigateToSearch: (term: string, filters?: SearchFilters) => void;
  updateFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
}

export function useSearchUrl(): UseSearchUrlReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }, [searchParams]);

  const currentSearch = useMemo(
    () => parseSearchUrl(pathname, paramsObj),
    [pathname, paramsObj]
  );

  const buildUrl = useCallback(
    (term: string, filters: SearchFilters = {}) => {
      return buildSearchUrl(window.location.origin, term, filters);
    },
    []
  );

  const navigateToSearch = useCallback(
    (term: string, filters: SearchFilters = {}) => {
      const url = buildSearchUrl(window.location.origin, term, filters);
      router.push(url);
    },
    [router]
  );

  const updateFilters = useCallback(
    (filters: SearchFilters) => {
      const term = currentSearch.term;
      if (!term) return;

      const merged = { ...currentSearch.filters, ...filters };
      const url = buildSearchUrl(window.location.origin, term, merged);
      router.push(url);
    },
    [currentSearch, router]
  );

  const clearSearch = useCallback(() => {
    router.push("/busca");
  }, [router]);

  return {
    buildUrl,
    currentSearch,
    navigateToSearch,
    updateFilters,
    clearSearch,
  };
}
