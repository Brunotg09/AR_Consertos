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
      console.error("Error fetching services:", err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Erro ao buscar serviços");
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

  const addService = async (service: Omit<ServiceItem, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .insert([service])
        .select()
        .single();

      if (error) throw error;
      setServices((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      return { data, error: null };
    } catch (err) {
      console.error("Error adding service:", err);
      return { data: null, error: err instanceof Error ? err.message : "Erro ao adicionar serviço" };
    }
  };

  const updateService = async (id: number, updates: Partial<ServiceItem>) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setServices((prev) =>
        prev.map((s) => (s.id === id ? data : s)).sort((a, b) => a.sort_order - b.sort_order)
      );
      return { data, error: null };
    } catch (err) {
      console.error("Error updating service:", err);
      return { data: null, error: err instanceof Error ? err.message : "Erro ao atualizar serviço" };
    }
  };

  const deleteService = async (id: number) => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      return { error: null };
    } catch (err) {
      console.error("Error deleting service:", err);
      return { error: err instanceof Error ? err.message : "Erro ao deletar serviço" };
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
