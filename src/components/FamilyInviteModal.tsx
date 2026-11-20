import React, { useEffect, useState } from 'react';
import {
  FaUsers,
  FaShieldAlt,
  FaCheckCircle,
  FaTimes,
  FaWhatsapp,
  FaExclamationTriangle,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { buildWhatsAppUrl } from '../utils/formatters';

export interface PendingFamilyInvite {
  id: string;
  inviterName: string;
  inviterMaskedCpf: string;
  inviterPhone?: string | null;
  groupName: string;
}

interface Props {
  invite: PendingFamilyInvite | null;
  onClose: () => void;
  onAccepted: () => void;
  onRejected: () => void;
}

const FamilyInviteModal: React.FC<Props> = ({
  invite,
  onClose,
  onAccepted,
  onRejected,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStep(1);
  }, [invite?.id]);

  if (!invite) return null;

  const waUrl = buildWhatsAppUrl(invite.inviterPhone);

  const handleReject = async () => {
    try {
      setLoading(true);
      await api.post(`/family/invites/${invite.id}/reject`);
      toast.info('Convite recusado.');
      onRejected();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao recusar convite.'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAccept = async () => {
    try {
      setLoading(true);
      await api.post(`/family/invites/${invite.id}/accept`, { confirmed: true });
      toast.success('Painel Família unificado com sucesso!');
      onAccepted();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao confirmar vínculo familiar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-[90]">
      <div className="exec-modal-container max-w-md">
        {step === 1 ? (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Convite para Modo Família
                  </h3>
                  <p className="text-xs text-slate-500">Etapa 1 de 2 — Verificação de convite</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
              >
                {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                O usuário <strong className="text-slate-950">{invite.inviterName}</strong> portador
                do CPF <strong className="tabular-nums text-slate-950">{invite.inviterMaskedCpf}</strong>{' '}
                quer unificar o painel de gastos com você. <strong>Você aceita?</strong>
              </p>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                >
                  {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  Conversar com {invite.inviterName} no WhatsApp
                </a>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-emerald-600 text-sm mt-0.5 flex-shrink-0',
                })}
                <span>
                  Você continuará tendo seu <strong>Painel Individual</strong> e ganhará o botão de
                  alternância para o <strong>Painel Família</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loading}
                  className="exec-btn-secondary text-rose-600 hover:text-rose-700"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="exec-btn-primary gap-2"
                >
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                  Sim, aceitar
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Confirmação de Segurança
                  </h3>
                  <p className="text-xs text-slate-500">Etapa 2 de 2 — Confirmação definitiva</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
              >
                {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Você tem certeza</strong> que deseja juntar o painel com o usuário{' '}
                <strong className="text-slate-950">{invite.inviterName}</strong> portador do CPF{' '}
                <strong className="tabular-nums text-slate-950">{invite.inviterMaskedCpf}</strong>?
              </p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1.5">
                <p>Ao confirmar:</p>
                <p>• As entradas e saídas serão consolidadas no <strong>Painel Família</strong> com identificação de cada pessoa.</p>
                <p>• Todas as atualizações serão refletidas em tempo real.</p>
                <p>• Somente contas autenticadas por <strong>CPF + ID</strong> vinculados terão acesso.</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="exec-btn-secondary"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                  {loading ? 'Unificando...' : 'Sim, tenho certeza'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FamilyInviteModal;
