"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, withTimeout } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface PartnerRow {
  id: string;
  user_id: string | null;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  photo_url: string;
  categories: string[];
  bio: string | null;
  experience_years: number | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  average_rating: number | null;
  total_ratings: number;
  mp_account_id: string | null;
  mp_connected_at: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook do parceiro logado (portal /parceiro).
 * Carrega o registro partners vinculado ao user_id atual.
 */
export function usePartner() {
  const { user, loading: authLoading } = useAuth();
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchPartner = useCallback(async () => {
    if (!user) {
      setPartner(null);
      setLoading(false);
      return;
    }
    try {
      const res = await withTimeout(
        () =>
          supabase
            .from("partners")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle<PartnerRow>(),
        5000,
        { data: null, error: null }
      );
      if (!mountedRef.current) return;
      setPartner((res as { data?: PartnerRow | null })?.data || null);
      setError(null);
    } catch {
      if (mountedRef.current) setError("Erro ao carregar parceiro");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading) fetchPartner();
    return () => {
      mountedRef.current = false;
    };
  }, [authLoading, fetchPartner]);

  return { partner, loading: authLoading || loading, error, refresh: fetchPartner };
}

/**
 * Lista de parceiros (admin).
 */
export function usePartnersList() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withTimeout(
        () =>
          supabase
            .from("partners")
            .select("*")
            .order("full_name", { ascending: true }),
        5000,
        { data: [], error: null }
      );
      if (mountedRef.current) {
        setPartners(((res as { data?: PartnerRow[] })?.data || []) as PartnerRow[]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPartners();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchPartners]);

  return { partners, loading, refresh: fetchPartners };
}
