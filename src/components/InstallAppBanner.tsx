import React, { useEffect, useState } from 'react';
import { FaDownload, FaMobileAlt, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppBannerProps {
  compact?: boolean;
}

const STORAGE_INSTALLED_KEY = 'pm_app_installed';

function checkIsInstalledOrDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === '1' || params.get('standalone') === '1') {
      localStorage.setItem(STORAGE_INSTALLED_KEY, '1');
      return true;
    }
    if (localStorage.getItem(STORAGE_INSTALLED_KEY) === '1') {
      return true;
    }
  } catch {
    // Ignore storage errors
  }

  return (
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
    Boolean(
      typeof window.matchMedia === 'function' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches),
    ) ||
    Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView)
  );
}

const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isHidden, setIsHidden] = useState<boolean>(() => checkIsInstalledOrDismissed());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (checkIsInstalledOrDismissed()) {
      setIsHidden(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(STORAGE_INSTALLED_KEY, '1');
      } catch {
        // Ignore
      }
      setIsHidden(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isHidden) return null;

  const markInstalledAndHide = () => {
    try {
      localStorage.setItem(STORAGE_INSTALLED_KEY, '1');
    } catch {
      // Ignore
    }
    setIsHidden(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        markInstalledAndHide();
        setDeferredPrompt(null);
      }
      return;
    }

    markInstalledAndHide();
    toast.info(
      'Toque em "Permitir" e depois confirme em Ajustes -> Perfil Baixado -> Instalar.',
      { autoClose: 7000 },
    );
    window.location.href = '/painel-monet.mobileconfig';
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-colors"
        title="Baixar e instalar aplicativo"
      >
        {React.createElement(FaMobileAlt as any, { className: 'text-xs text-emerald-700' })}
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/logo192.png?v=3"
          alt="Finanças"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            Instalar aplicativo Finanças
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            Baixar instalador direto para iPhone ou Android
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
        >
          {React.createElement(FaDownload as any, { className: 'text-xs' })}
          Instalar
        </button>
        <button
          type="button"
          onClick={markInstalledAndHide}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Ocultar aviso de instalação"
          title="Já instalei / Ocultar"
        >
          {React.createElement(FaTimes as any, { className: 'text-xs' })}
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
