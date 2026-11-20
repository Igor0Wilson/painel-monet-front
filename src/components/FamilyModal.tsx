import React, { useState } from 'react';
import {
  FaTimes,
  FaUsers,
  FaUserPlus,
  FaShieldAlt,
  FaWhatsapp,
  FaSignOutAlt,
  FaClock,
  FaTrash,
  FaUserEdit,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { buildWhatsAppUrl, formatCpfInput, onlyDigits } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyStatus: any;
  onRefresh: () => void;
  onOpenProfile: () => void;
}

const FamilyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  familyStatus,
  onRefresh,
  onOpenProfile,
}) => {
  const [cpfInput, setCpfInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!isOpen) return null;

  const hasCpf = Boolean(familyStatus?.hasCpf);
  const members: any[] = familyStatus?.members || [];
  const pendingSentInvites: any[] = familyStatus?.pendingSentInvites || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = onlyDigits(cpfInput);
    if (digits.length !== 11) {
      toast.error('Informe um CPF completo com 11 dígitos.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/family/invite', { cpf: digits });
      toast.success(res.data?.message || 'Convite enviado!');
      setCpfInput('');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao enviar convite'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await api.delete(`/family/invites/${inviteId}`);
      toast.info('Convite cancelado.');
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao cancelar convite.'));
    }
  };

  const handleLeaveFamily = async () => {
    try {
      setLeaving(true);
      const res = await api.post('/family/leave');
      toast.success(res.data?.message || 'Você saiu do Modo Família.');
      onRefresh();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao sair do grupo familiar'));
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-executive-lg w-full max-w-xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {React.createElement(FaUsers as any, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Modo Família</h3>
              <p className="text-xs text-slate-500">
                Unifique o painel financeiro com seu cônjuge ou familiares (2 ou mais pessoas)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg"
          >
            {React.createElement(FaTimes as any, { className: 'text-sm' })}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Security notice */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-3">
            {React.createElement(FaShieldAlt as any, {
              className: 'text-emerald-600 text-sm mt-0.5 flex-shrink-0',
            })}
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Proteção Dupla (CPF + ID):</strong> somente
              usuários encontrados pelo CPF exato e que aceitarem a <strong>dupla confirmação</strong>{' '}
              podem visualizar o Painel Família. Os painéis sincronizam automaticamente.
            </div>
          </div>

          {/* Convite por CPF */}
          {!hasCpf ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <p className="text-xs font-medium text-amber-900">
                Para usar o Modo Família, primeiro cadastre o seu próprio <strong>CPF</strong> no
                seu perfil.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="exec-btn-primary text-xs gap-2"
              >
                {React.createElement(FaUserEdit as any, { className: 'text-xs' })}
                Cadastrar meu CPF no Perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-3">
              <label className="exec-label">
                Convidar cônjuge ou familiar pelo CPF
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCpfInput(e.target.value))}
                  className="exec-input tabular-nums flex-1"
                  placeholder="000.000.000-00"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="exec-btn-primary gap-2 whitespace-nowrap"
                >
                  {React.createElement(FaUserPlus as any, { className: 'text-xs' })}
                  <span>{loading ? 'Buscando...' : 'Enviar Convite'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Seu CPF cadastrado: <span className="font-semibold text-slate-600">{familyStatus?.maskedCpf}</span>. A pessoa receberá um alerta em tempo real para confirmar duas vezes antes de unificar.
              </p>
            </form>
          )}

          {/* Membros ativos */}
          {members.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Membros do Painel Família ({members.length})
                </h4>
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {members.map((member) => {
                  const waUrl = buildWhatsAppUrl(member.phone);
                  return (
                    <div
                      key={member.userId}
                      className="px-4 py-3 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {member.name}
                          </p>
                          {member.isSelf && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 tabular-nums">
                          CPF: {member.maskedCpf}
                        </p>
                      </div>

                      {waUrl && !member.isSelf && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 text-xs font-medium transition-colors"
                        >
                          {React.createElement(FaWhatsapp as any, { className: 'text-sm' })}
                          WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Convites enviados aguardando confirmação */}
          {pendingSentInvites.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Convites Enviados (Aguardando Confirmação)
              </h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {pendingSentInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="px-4 py-3 bg-amber-50/40 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {inv.inviteeName}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        {React.createElement(FaClock as any, { className: 'text-[10px] text-amber-600' })}
                        CPF: {inv.inviteeMaskedCpf} · Aguardando aceite
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(inv.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Cancelar convite"
                    >
                      {React.createElement(FaTrash as any, { className: 'text-xs' })}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {familyStatus?.hasGroup ? (
              <button
                type="button"
                onClick={handleLeaveFamily}
                disabled={leaving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                {React.createElement(FaSignOutAlt as any, { className: 'text-xs' })}
                {leaving ? 'Saindo...' : 'Desvincular do Modo Família'}
              </button>
            ) : (
              <span />
            )}

            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyModal;
