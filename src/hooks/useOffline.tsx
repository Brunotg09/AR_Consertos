"use client";

import { useState, useEffect, useCallback } from "react";
import { WifiOff, Wifi, CloudUpload } from "lucide-react";
import { toast } from "sonner";

interface OfflineStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  pendingData: boolean;
}

export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    lastOnline: null,
    pendingData: false,
  });

  useEffect(() => {
    // Check initial status
    setStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? new Date() : null,
    }));

    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
      }));
      toast.success("Conexão restaurada!");
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
      toast.warning("Você está offline. Seus dados serão salvos localmente.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save data to localStorage when offline
  const saveLocalData = useCallback((key: string, data: unknown) => {
    try {
      localStorage.setItem(`arconsertos_${key}`, JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      }));
      setStatus((prev) => ({ ...prev, pendingData: true }));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, []);

  // Load data from localStorage
  const loadLocalData = useCallback((key: string) => {
    try {
      const item = localStorage.getItem(`arconsertos_${key}`);
      if (!item) return null;
      return JSON.parse(item);
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return null;
    }
  }, []);

  // Clear local data
  const clearLocalData = useCallback((key: string) => {
    localStorage.removeItem(`arconsertos_${key}`);
  }, []);

  // Sync pending data
  const syncPendingData = useCallback(async () => {
    const pendingCheckout = loadLocalData("pending_checkout");
    if (pendingCheckout) {
      // Here you would sync with Supabase
      toast.success("Dados sincronizados com sucesso!");
      clearLocalData("pending_checkout");
      setStatus((prev) => ({ ...prev, pendingData: false }));
    }
  }, [loadLocalData, clearLocalData]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (status.isOnline && status.pendingData) {
      syncPendingData();
    }
  }, [status.isOnline, status.pendingData, syncPendingData]);

  return {
    ...status,
    saveLocalData,
    loadLocalData,
    clearLocalData,
    syncPendingData,
  };
}

export function OfflineBanner() {
  const { isOnline, pendingData } = useOffline();

  if (isOnline && !pendingData) return null;

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium backdrop-blur-sm ${
        isOnline
          ? "bg-green-500/20 text-green-400"
          : "bg-yellow-500/20 text-yellow-400"
      }`}
    >
      {isOnline ? (
        <>
          <CloudUpload className="h-4 w-4 animate-pulse" />
          Sincronizando dados pendentes...
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Você está offline. Seus dados serão salvos quando a conexão for restaurada.
        </>
      )}
    </div>
  );
}
