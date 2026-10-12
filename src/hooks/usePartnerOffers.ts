"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, withTimeout } from "@/lib/supabase";

export interface PartnerOffer {
  id: string;
  client_name: string;
  client_phone: string | null;
  address: string;
  scheduled_date: string | null;
  category: string;
  service_type: string | null;
  commission_percentage: number;
  total: number | null;
  offer_expires_at: string;
  created_at: string;
  order_id: string | null;
  order_item_id: number | null;
  item_name: string | null;
  item_description: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Ofertas disponíveis para o parceiro logado (modo corrida).
 */
export function usePartnerOffers() {
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchOffers = useCallback(async () => {
    try {
      const { data, error } = await withTimeout(
        () => supabase.rpc("get_partner_offers"),
        5000,
        { data: null, error: null }
      );
      if (error) throw error;
      if (mountedRef.current) setOffers((data as PartnerOffer[]) || []);
    } catch {
      if (mountedRef.current) setOffers([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchOffers();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOffers]);

  /**
   * Aceita a oferta. Retorna true se aceita, false se já foi aceita por outro.
   */
  const acceptOffer = useCallback(
    async (serviceOrderId: string): Promise<boolean> => {
      const { data, error } = await withTimeout(
        () => supabase.rpc("accept_service_offer", { p_service_order_id: serviceOrderId }),
        8000,
        { data: null, error: new Error("Timeout") }
      );
      if (error || data !== true) return false;
      setOffers((prev) => prev.filter((o) => o.id !== serviceOrderId));
      // Push best-effort para admins
      fetch("/api/notifications/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "offer_accepted", serviceOrderId }),
      }).catch(() => null);
      return true;
    },
    []
  );

  return { offers, loading, acceptOffer, refresh: fetchOffers };
}
