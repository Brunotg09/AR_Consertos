"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, withTimeout } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { usePartner } from "./usePartners";

export interface PartnerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  service_order_id: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Central de notificações in-app do parceiro (sino).
 * Assina Realtime na tabela partner_notifications do parceiro atual.
 */
export function usePartnerNotifications() {
  const { user } = useAuth();
  const { partner } = usePartner();
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await withTimeout(
        () => supabase.rpc("get_partner_notifications", { p_limit: 30 }),
        5000,
        { data: null, error: null }
      );
      if (error) throw error;
      if (mountedRef.current) setNotifications((data as PartnerNotification[]) || []);
    } catch {
      if (mountedRef.current) setNotifications([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (user) fetchNotifications();
    return () => {
      mountedRef.current = false;
    };
  }, [user, fetchNotifications]);

  // Realtime
  const channelSuffixRef = useRef<string>(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!partner?.id) return;

    const channel = supabase
      .channel(`partner-notif-${partner.id}-${channelSuffixRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partner_notifications",
          filter: `partner_id=eq.${partner.id}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          setNotifications((prev) => [
            payload.new as PartnerNotification,
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id]);

  const markAsRead = useCallback(async (id: string) => {
    if (!mountedRef.current) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    );
    await withTimeout(
      () => supabase.rpc("mark_notification_read", { p_notification_id: id }),
      5000,
      null
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refresh: fetchNotifications,
  };
}
