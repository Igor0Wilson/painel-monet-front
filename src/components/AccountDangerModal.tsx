import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaDownload,
  FaExclamationTriangle,
  FaPauseCircle,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { extractApiErrorMessage } from '../utils/errorHandler';

interface AccountDangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadBackup: () => Promise<void>;
  downloading: boolean;
}

const AccountDangerModal: React.FC<AccountDangerModalProps> = ({
  isOpen,
  onClose,
  onDownloadBackup,
  downloading,
}) => {
  const [selectedAction, setSelectedAction] = useState<'deactivate' | 'delete' | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const resetAndClose = () => {
    setSelectedAction(null);
    setStep(1);
    setConfirmChecked(false);
    setConfirmText('');
    onClose();
  };

  const handleProceedToSecondConfirmation = (action: 'deactivate' | 'delete') => {
    setSelectedAction(action);
    setConfirmChecked(false);
    setConfirmText('');
    setStep(2);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || !confirmChecked) {
      toast.error('Marque a confirmação de segurança para continuar.');
      return;
    }

    if (selectedAction === 'delete' && confirmText.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar a exclusão permanente.');
      return;
    }

    try {
      setSubmitting(true);
      if (selectedAction === 'deactivate') {
        const res = await api.post('/users/me/deactivate', { confirmed: true });
        toast.info(
          res.data?.message ||
            'Conta desativada. Para reativar, solicite o e-mail de reativação na tela de login.',
        );
      } else {
        const res = await api.delete('/users/me', {
          data: { confirmed: true, confirmText: confirmText.trim().toUpperCase() },
        });
        toast.success(
          res.data?.message || 'Conta e login no Firebase excluídos permanentemente.',
        );
      }

      logout();
      resetAndClose();
      navigate('/login');
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, 'Não foi possível concluir a solicitação'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[120]">
      <div className="exec-modal-container max-w-lg">
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {step === 1
                  ? 'Gerenciar Desativação ou Exclusão (1/2)'
                  : selectedAction === 'deactivate'
                    ? 'Dupla Confirmação — Desativar Conta (2/2)'
                    : 'Dupla Confirmação — Excluir Conta (2/2)'}
              </h3>
              <p className="text-[11px] text-rose-200/80">
                Recomendamos baixar seus dados antes de continuar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-rose-200 hover:text-white p-1.5 rounded-lg"
            aria-label="Fechar"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Backup completo dos seus dados
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Baixe um arquivo JSON com receitas, despesas, categorias e saldos.
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadBackup}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex-shrink-0 disabled:opacity-60"
            >
              {React.createElement(FaDownload as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              {downloading ? 'Baixando...' : 'Baixar meus dados'}
            </button>
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-950 flex items-center gap-2">
                      {React.createElement(FaPauseCircle as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-amber-600 text-sm',
                      })}
                      Desativar conta temporariamente (Recomendado)
                    </p>
                    <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                      Seus dados ficam guardados com segurança e o acesso é bloqueado.
                      Para voltar no futuro, basta solicitar o <strong>e-mail oficial de reativação</strong>,
                      definir uma nova senha e a conta será reativada automaticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleProceedToSecondConfirmation('deactivate')}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                >
                  Escolher desativar conta
                </button>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="text-sm font-semibold text-rose-950 flex items-center gap-2">
                  {React.createElement(FaTrashAlt as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-rose-600 text-sm',
                  })}
                  Excluir conta permanentemente
                </p>
                <p className="text-xs text-rose-900/90 mt-1 leading-relaxed">
                  Apaga <strong>irreversivelmente</strong> todos os seus dados financeiros,
                  seu cadastro no banco e <strong>seu login no Firebase</strong> (liberando seu
                  e-mail e CPF caso queira criar uma nova conta no futuro).
                </p>
                <button
                  type="button"
                  onClick={() => handleProceedToSecondConfirmation('delete')}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                >
                  Escolher excluir permanentemente
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-xl p-4 border text-xs leading-relaxed ${
                  selectedAction === 'deactivate'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                {selectedAction === 'deactivate' ? (
                  <p>
                    <strong>Segunda confirmação:</strong> sua sessão será encerrada agora e sua
                    senha atual será invalidada. Você só poderá reativar clicando em{' '}
                    <strong>&quot;Esqueci minha senha / Reativar conta&quot;</strong> e
                    confirmando o link enviado pelo Firebase no seu e-mail.
                  </p>
                ) : (
                  <p>
                    <strong>Ação irreversível:</strong> todos os lançamentos, categorias, reserva,
                    investimentos, vínculos de família e o login no Firebase serão removidos
                    definitivamente agora.
                  </p>
                )}
              </div>

              {selectedAction === 'delete' && (
                <div>
                  <label htmlFor="delete-confirm-text" className="exec-label">
                    Digite <strong>EXCLUIR</strong> para confirmar
                  </label>
                  <input
                    id="delete-confirm-text"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="exec-input uppercase font-mono tracking-wider"
                    placeholder="EXCLUIR"
                  />
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  {selectedAction === 'deactivate'
                    ? 'Confirmo que desejo desativar minha conta e estou ciente de que a reativação exige disparo de e-mail.'
                    : 'Confirmo que baixei meus dados (se desejar) e quero excluir permanentemente minha conta e meu login no Firebase.'}
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={submitting}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold transition-colors disabled:opacity-60 ${
                    selectedAction === 'deactivate'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting
                    ? 'Processando...'
                    : selectedAction === 'deactivate'
                      ? 'Confirmar desativação'
                      : 'Confirmar exclusão definitiva'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDangerModal;
