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
}

export function useServices(options?: { activeOnly?: boolean; type?: string }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchServices = useCallback(async () => {
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
      if (mountedRef.current) {
        setServices(data || []);
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
  }, [options?.activeOnly, options?.type]);

  useEffect(() => {
    mountedRef.current = true;
    fetchServices();
    return () => { mountedRef.current = false; };
  }, [fetchServices]);

  const addService = async (service: Omit<ServiceItem, "id" | "created_at" | "updated_at" | "service_id"> & Partial<Pick<ServiceItem, "service_id">>) => {
    try {
      const service_id = service.service_id || generateServiceId(service.name);
      const { error } = await supabase
        .from("services")
        .insert([{ ...service, service_id }]);

      if (error) throw error;
      await fetchServices();
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: "Erro ao adicionar serviço" };
    }
  };

  function generateServiceId(name: string): string {
    const slug = (name || "service")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `svc-${slug}-${Date.now()}`;
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
