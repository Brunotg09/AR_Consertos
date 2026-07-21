'use client';

import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { useState, useEffect } from 'react';
import { RefreshCw, X, Zap } from 'lucide-react';

export function UpdateBanner() {
  const { isUpdateAvailable, isUpdating, applyUpdate } = useServiceWorkerUpdate();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateAvailable]);

  useEffect(() => {
    if (visible && !closing) {
      const timer = setTimeout(() => {
        setClosing(true);
        setTimeout(() => setVisible(false), 500);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [visible, closing]);

  const handleUpdate = () => {
    applyUpdate();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setVisible(false), 500);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[200] p-3 sm:p-4 ${closing ? 'update-slide-up' : 'update-slide-down'}`}
    >
      <div
        className="mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 update-glow"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        }}
      >
        <div className="h-[2px] w-full pwabanner-shimmer" />

        <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
          <div
            className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #E30613 50%, #8B5CF6 100%)',
            }}
          >
            {isUpdating ? (
              <RefreshCw className="h-6 w-6 text-white" style={{ animation: 'update-spin 1s linear infinite' }} />
            ) : (
              <Zap className="h-6 w-6 text-white update-bounce" />
            )}
            <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-yellow-400 opacity-80 update-pulse" />
            <div className="absolute -bottom-0.5 -left-0.5 h-2 w-2 rounded-full bg-red-500 opacity-80 update-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-black tracking-tight text-white sm:text-base"
              style={{
                background: 'linear-gradient(90deg, #C9A84C, #ffffff, #C9A84C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NOVA VERSÃO DISPONÍVEL!
            </h3>
            <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">
              Atualize para ter a última versão do app
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition-all sm:px-5 sm:py-3 sm:text-sm"
              style={{
                background: isUpdating
                  ? 'linear-gradient(135deg, #666 0%, #888 50%, #666 100%)'
                  : 'linear-gradient(135deg, #C9A84C 0%, #e6c560 50%, #C9A84C 100%)',
                backgroundSize: '200% 100%',
                animation: isUpdating ? 'none' : 'update-pulse 2s ease-in-out infinite',
                boxShadow: isUpdating
                  ? '0 4px 15px rgba(100,100,100,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : '0 4px 15px rgba(201,168,76,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'ATUALIZANDO...' : 'ATUALIZAR'}
            </button>

            <button
              onClick={handleClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              aria-label="Fechar"
            >
              <X className="h-4 w-4 text-white/50" />
            </button>
          </div>
        </div>

        <div className="h-[1px] w-full pwabanner-shimmer-bottom" />
      </div>
    </div>
  );
}
