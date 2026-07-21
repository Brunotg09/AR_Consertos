'use client';

import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function InstallBanner() {
  const { canInstall, isInstalled, install, dismiss } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  useEffect(() => {
    if (visible && !closing) {
      const timer = setTimeout(() => {
        setClosing(true);
        setTimeout(() => setVisible(false), 500);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [visible, closing]);

  const handleInstall = async () => {
    setIsInstalling(true);
    await install();
    setIsInstalling(false);
    setClosing(true);
    setTimeout(() => setVisible(false), 500);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      dismiss();
    }, 500);
  };

  if (!visible || isInstalled) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4 ${closing ? 'pwabanner-slide-down' : 'pwabanner-slide-up'}`}
    >
      <div
        className="mx-auto max-w-lg overflow-hidden rounded-2xl border-2 pwabanner-glow"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        }}
      >
        <div className="h-[2px] w-full pwabanner-shimmer" />

        <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
          <div
            className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16 pwabanner-shake"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #E30613 50%, #8B5CF6 100%)',
            }}
          >
            <Smartphone className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-yellow-400 opacity-80 pwabanner-pulse" />
            <div className="absolute -bottom-0.5 -left-0.5 h-2 w-2 rounded-full bg-red-500 opacity-80 pwabanner-pulse" style={{ animationDelay: '0.5s' }} />
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
              INSTALE O APP
            </h3>
            <p className="mt-0.5 text-[10px] text-white/50 sm:text-xs">
              Acesse rápido pelo seu celular
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-black transition-all sm:px-5 sm:py-3 sm:text-sm pwabanner-pulse pwabanner-gradient"
              style={{
                background: isInstalling
                  ? 'linear-gradient(135deg, #666 0%, #888 50%, #666 100%)'
                  : 'linear-gradient(135deg, #C9A84C 0%, #e6c560 50%, #C9A84C 100%)',
                backgroundSize: '200% 100%',
                boxShadow: '0 4px 15px rgba(201,168,76,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <Download className="h-4 w-4" />
              {isInstalling ? '...' : 'INSTALAR'}
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
