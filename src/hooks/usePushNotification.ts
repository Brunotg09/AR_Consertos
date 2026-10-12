"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook de push notifications (in-app via service worker).
 * Salva a subscription no browser e registra em push_subscriptions.
 */
export function usePushNotification() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  const register = useCallback(async () => {
    if (!user || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
        });
        const json = sub.toJSON();
        const token = JSON.stringify(json);
        if (json.endpoint) {
          await supabase.from("push_subscriptions").upsert(
            { user_id: user.id, token, platform: "web", last_used_at: new Date().toISOString() },
            { onConflict: "token" }
          );
        }
      }
    } catch {
      // push é best-effort; falha silenciosa
    }
  }, [user]);

  useEffect(() => {
    if (user && permission === "granted") {
      register();
    }
  }, [user, permission, register]);

  return { supported, permission, requestPermission, register };
}
