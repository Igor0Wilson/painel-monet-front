import React, { useEffect, useState } from 'react';
import { FaDownload, FaMobileAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppBannerProps {
  compact?: boolean;
}

function checkIsRunningInsideApp(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem('pm_app_installed');
    sessionStorage.removeItem('pm_app_installed');
  } catch {
    // Ignore storage errors
  }

  const win = window as unknown as {
    __PM_RUNNING_IN_APP__?: boolean;
    ReactNativeWebView?: unknown;
  };

  if (win.__PM_RUNNING_IN_APP__) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('app') === '1' || params.get('standalone') === '1') {
    win.__PM_RUNNING_IN_APP__ = true;
    return true;
  }

  return (
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
    Boolean(
      typeof window.matchMedia === 'function' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches),
    ) ||
    Boolean(win.ReactNativeWebView)
  );
}

const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInsideApp, setIsInsideApp] = useState<boolean>(() => checkIsRunningInsideApp());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    setIsInsideApp(checkIsRunningInsideApp());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInsideApp) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

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
        {React.createElement(FaMobileAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs text-emerald-700' })}
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/logo192.png?v=4"
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
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors flex-shrink-0"
      >
        {React.createElement(FaDownload as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
        Instalar
      </button>
    </div>
  );
};

export default InstallAppBanner;
