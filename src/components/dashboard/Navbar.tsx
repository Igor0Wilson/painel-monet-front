import React, { useState } from 'react';
import {
  FaDownload,
  FaSignOutAlt,
  FaUser,
  FaUsers,
} from 'react-icons/fa';
import { FamilyStatusData, PanelScope } from '../../types/finance';
import { downloadUserFinancialData } from '../../utils/downloadUserData';
import InstallAppBanner from '../InstallAppBanner';

interface Props {
  userId?: string;
  userName?: string;
  userCpf?: string | null;
  userInitials: string;
  panelScope: PanelScope;
  familyStatus: FamilyStatusData | null;
  pendingInvitesCount: number;
  onChangeScope: (scope: PanelScope) => void;
  onOpenFamilyModal: () => void;
  onOpenProfileModal: () => void;
  onRequestLogout: () => void;
}

const Navbar: React.FC<Props> = ({
  userId,
  userName,
  userCpf,
  userInitials,
  panelScope,
  familyStatus,
  pendingInvitesCount,
  onChangeScope,
  onOpenFamilyModal,
  onOpenProfileModal,
  onRequestLogout,
}) => {
  const isFamilyMode = panelScope === 'family';
  const [downloading, setDownloading] = useState(false);

  const handleDownloadClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadUserFinancialData({ userId, cpf: userCpf });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <nav className="safe-top-navbar bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[3.5rem] sm:h-16 py-1.5 sm:py-0 flex justify-between items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src="/logo192.png?v=4"
            alt="Finanças"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm flex-shrink-0 object-cover"
          />
          <div className="leading-tight truncate">
            <span className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight block truncate">
              Finanças
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              {isFamilyMode ? 'Painel Família Unificado' : 'Gestão Patrimonial'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <InstallAppBanner compact />

          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Baixar todas as informações e valores vinculados ao seu CPF + ID"
          >
            {React.createElement(FaDownload as any, { className: 'text-xs text-emerald-700' })}
            <span className="hidden md:inline">
              {downloading ? 'Baixando...' : 'Baixar Dados'}
            </span>
          </button>

          {familyStatus?.inFamily && (
            <div className="hidden md:inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => onChangeScope('individual')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  panelScope === 'individual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {React.createElement(FaUser as any, { className: 'text-[10px]' })}
                Individual
              </button>
              <button
                type="button"
                onClick={() => onChangeScope('family')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  panelScope === 'family'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {React.createElement(FaUsers as any, { className: 'text-[11px]' })}
                Família ({familyStatus.members?.length || 2})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFamilyModal}
            className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            title="Gerenciar Modo Família"
          >
            {React.createElement(FaUsers as any, { className: 'text-xs text-slate-700' })}
            <span className="hidden sm:inline">Modo Família</span>
            {pendingInvitesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingInvitesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 pl-1 pr-1.5 sm:pr-3 py-1 rounded-xl hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200/80"
            title="Editar perfil, CPF e WhatsApp"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-900 max-w-[120px] truncate">
                {userName}
              </p>
              <p className="text-[11px] text-slate-400">Perfil & CPF</p>
            </div>
          </button>

          <button
            type="button"
            onClick={onRequestLogout}
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Encerrar sessão"
          >
            {React.createElement(FaSignOutAlt as any, { className: 'text-sm' })}
            <span className="hidden lg:inline">Sair</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
