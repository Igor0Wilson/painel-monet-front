import React, { useEffect, useState } from 'react';
import { FaApple, FaDownload, FaMobileAlt, FaPlusSquare, FaShareSquare, FaTimes } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppBannerProps {
  compact?: boolean;
}

const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const standalone =
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
      Boolean(
        typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches,
      ) ||
      Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);

    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

    setShowGuideModal(true);
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-colors"
          title="Instalar aplicativo no iPhone ou Android"
        >
          {React.createElement(FaMobileAlt as any, { className: 'text-xs text-emerald-700' })}
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      ) : (
        <div className="mt-4 rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo192.png?v=2"
              alt="Painel Monet"
              className="w-10 h-10 rounded-xl flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Instalar aplicativo Painel Monet
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Tenha o ícone na tela inicial no iPhone e Android
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors flex-shrink-0"
          >
            {React.createElement(FaDownload as any, { className: 'text-xs' })}
            Instalar
          </button>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo192.png?v=2"
                  alt="Painel Monet"
                  className="w-9 h-9 rounded-xl"
                />
                <div>
                  <h3 className="text-sm font-semibold">Instalar no iPhone / iOS</h3>
                  <p className="text-[11px] text-slate-400">
                    Fica idêntico ao aplicativo nativo em tela cheia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
                aria-label="Fechar"
              >
                {React.createElement(FaTimes as any, { className: 'text-sm' })}
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  1
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  No <strong>Safari do iPhone</strong>, toque no botão{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    {React.createElement(FaShareSquare as any, { className: 'text-blue-600' })}
                    Compartilhar
                  </span>{' '}
                  na barra inferior da tela.
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  2
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  Role o menu para baixo e toque em{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    {React.createElement(FaPlusSquare as any, { className: 'text-emerald-600' })}
                    Adicionar à Tela de Início
                  </span>{' '}
                  e depois em <strong>Adicionar</strong>.
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-2.5 text-xs text-emerald-900">
                {React.createElement(FaApple as any, {
                  className: 'text-emerald-700 text-base flex-shrink-0',
                })}
                <span>
                  Pronto! O ícone do <strong>Painel Monet</strong> aparecerá na tela inicial do seu
                  iPhone e abrirá em <strong>tela cheia como aplicativo</strong> (igual ao Android).
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="exec-btn-primary w-full py-2.5"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppBanner;
