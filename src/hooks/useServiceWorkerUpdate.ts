'use client';

import { useState, useEffect } from 'react';

export function useServiceWorkerUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          setIsUpdateAvailable(true);
        }

        registration.update();
      } catch (error) {
        console.error('SW update check failed:', error);
      }
    };

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 60 * 1000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    setIsUpdating(true);
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  };

  return { isUpdateAvailable, isUpdating, applyUpdate };
}
