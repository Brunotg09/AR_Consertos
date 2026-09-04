"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface ServiceItem {
  id: number;
  service_id: string;
  name: string;
  description: string;
  category: string;
  type: "convencional" | "inverter";
  price: number | null;
  discount_percentage: number;
  badge_garantia: string;
  icon_name: string;
  images: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  partner_id?: string | null;
  partner_name?: string | null;
  pricing_config?: {
    model?: "avulso" | "assinatura" | "ambos";
    intervals?: { value: string; label: string; days: number; price: number }[];
  } | null;
}

// Simple in-memory cache to avoid duplicate fetches
const servicesCache = new Map<string, { data: ServiceItem[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCacheKey(options?: { activeOnly?: boolean; type?: string }): string {
  return `${options?.activeOnly ?? true}-${options?.type ?? "all"}`;
}

export function useServices(options?: { activeOnly?: boolean; type?: string }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const cacheKey = getCacheKey(options);

  const fetchServices = useCallback(async () => {
    // Check cache first
    const cached = servicesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (mountedRef.current) {
        setServices(cached.data);
        setError(null);
        setLoading(false);
      }
      return;
    }

    try {
      let query = supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true });

      if (options?.activeOnly !== false) {
        query = query.eq("active", true);
      }

      if (options?.type) {
        query = query.eq("type", options.type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const result = data || [];

      // Update cache
      servicesCache.set(cacheKey, { data: result, timestamp: Date.now() });

      if (mountedRef.current) {
        setServices(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError("Erro ao buscar serviços");
        setServices([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [cacheKey, options?.activeOnly, options?.type]);

  useEffect(() => {
    mountedRef.current = true;
    fetchServices();
    return () => { mountedRef.current = false; };
  }, [fetchServices]);

  const addService = async (service: Omit<ServiceItem, "id" | "created_at" | "updated_at" | "service_id"> & Partial<Pick<ServiceItem, "service_id">>) => {
    try {
      const service_id = service.service_id || generateServiceId(service.name);
      const insertData: Record<string, any> = {
        service_id,
        name: service.name,
        description: service.description,
        category: service.category,
        type: service.type,
        price: service.price,
        discount_percentage: service.discount_percentage,
        badge_garantia: service.badge_garantia,
        icon_name: service.icon_name,
        images: service.images,
        active: service.active,
        sort_order: service.sort_order,
      };
      if (service.pricing_config) {
        insertData.pricing_config = service.pricing_config;
      }

      const { error } = await supabase
        .from("services")
        .insert([insertData]);

      if (error) throw error;
      await fetchServices();
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || "Erro ao adicionar serviço" };
    }
  };

  function generateServiceId(name: string, id?: number): string {
    const slug = (name || "service")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const suffix = id ? `-${id}` : `-${Date.now()}`;
    return `${slug}${suffix}`;
  }

  const updateService = async (id: number, updates: Partial<ServiceItem>) => {
    try {
      const { error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchServices();
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: "Erro ao atualizar serviço" };
    }
  };

  const deleteService = async (id: number) => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      return { error: null };
    } catch (err) {
      return { error: "Erro ao deletar serviço" };
    }
  };

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    addService,
    updateService,
    deleteService,
  };
}
