import React, { useEffect, useState } from 'react';
import {
  FaCheckDouble,
  FaClock,
  FaLock,
  FaShieldAlt,
  FaSignOutAlt,
  FaTimes,
  FaTrash,
  FaUserEdit,
  FaUserPlus,
  FaUsers,
  FaWhatsapp,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type {
  FamilyMemberPermissions,
  FamilyMemberSummary,
  FamilyStatusData,
  MemberPrivacyRule,
  PendingSentInvite,
} from '../types/finance';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { buildWhatsAppUrl, formatCpfInput, onlyDigits } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyStatus: FamilyStatusData | null;
  onRefresh: () => void;
  onOpenProfile: () => void;
}

const FULL_PERMISSIONS: FamilyMemberPermissions = {
  viewBalance: true,
  viewIncome: true,
  viewExpenses: true,
  viewInvestments: true,
  viewEmergencyFund: true,
  viewFoodAllowance: true,
};

const RESTRICTED_PERMISSIONS: FamilyMemberPermissions = {
  viewBalance: false,
  viewIncome: false,
  viewExpenses: false,
  viewInvestments: false,
  viewEmergencyFund: false,
  viewFoodAllowance: false,
};

const PERMISSION_FIELDS: Array<{
  key: keyof FamilyMemberPermissions;
  label: string;
}> = [
  { key: 'viewBalance', label: 'Painel Individual & Saldo Livre' },
  { key: 'viewIncome', label: 'Renda, Salários & Receitas' },
  { key: 'viewExpenses', label: 'Despesas, Cartão & Gráficos' },
  { key: 'viewInvestments', label: 'Investimentos & Datas' },
  { key: 'viewEmergencyFund', label: 'Reserva de Emergência' },
  { key: 'viewFoodAllowance', label: 'Vale Alimentação / Refeição' },
];

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
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [fullAccessAll, setFullAccessAll] = useState(true);
  const [rulesByMember, setRulesByMember] = useState<Record<string, FamilyMemberPermissions>>({});

  useEffect(() => {
    if (!isOpen || !familyStatus) return;
    setFullAccessAll(familyStatus.myPrivacy?.fullAccessAll ?? true);
    const nextMap: Record<string, FamilyMemberPermissions> = {};
    const existingRules = familyStatus.myPrivacy?.rules || [];
    for (const m of familyStatus.members || []) {
      if (m.isSelf) continue;
      const found = existingRules.find((r) => r.targetUserId === m.userId);
      nextMap[m.userId] = found
        ? {
            viewBalance: Boolean(found.viewBalance),
            viewIncome: Boolean(found.viewIncome),
            viewExpenses: Boolean(found.viewExpenses),
            viewInvestments: Boolean(found.viewInvestments),
            viewEmergencyFund: Boolean(found.viewEmergencyFund),
            viewFoodAllowance: Boolean(found.viewFoodAllowance),
          }
        : { ...FULL_PERMISSIONS };
    }
    setRulesByMember(nextMap);
  }, [isOpen, familyStatus]);

  if (!isOpen) return null;

  const hasCpf = Boolean(familyStatus?.hasCpf);
  const members: FamilyMemberSummary[] = familyStatus?.members || [];
  const otherMembers = members.filter((m) => !m.isSelf);
  const pendingSentInvites: PendingSentInvite[] = familyStatus?.pendingSentInvites || [];

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

  const buildRulesPayload = (
    targetMap: Record<string, FamilyMemberPermissions>,
  ): MemberPrivacyRule[] =>
    otherMembers.map((m) => ({
      targetUserId: m.userId,
      ...(targetMap[m.userId] || FULL_PERMISSIONS),
    }));

  const savePrivacy = async (
    nextFullAccess: boolean,
    nextMap: Record<string, FamilyMemberPermissions>,
    successMsg = 'Permissões de privacidade atualizadas!',
  ) => {
    try {
      setSavingPrivacy(true);
      await api.patch('/family/privacy', {
        fullAccessAll: nextFullAccess,
        rules: buildRulesPayload(nextMap),
      });
      toast.success(successMsg);
      onRefresh();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao atualizar permissões do Painel Família'));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleToggleMemberPermission = (
    memberId: string,
    field: keyof FamilyMemberPermissions,
  ) => {
    setRulesByMember((prev) => {
      const current = prev[memberId] || { ...FULL_PERMISSIONS };
      return {
        ...prev,
        [memberId]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  const handlePresetMember = (memberId: string, full: boolean) => {
    setRulesByMember((prev) => ({
      ...prev,
      [memberId]: full ? { ...FULL_PERMISSIONS } : { ...RESTRICTED_PERMISSIONS },
    }));
  };

  const handleGrantFullAccessToAll = () => {
    const allFullMap: Record<string, FamilyMemberPermissions> = {};
    for (const m of otherMembers) {
      allFullMap[m.userId] = { ...FULL_PERMISSIONS };
    }
    setFullAccessAll(true);
    setRulesByMember(allFullMap);
    savePrivacy(true, allFullMap, 'Acesso total liberado para todos no Painel Família!');
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
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
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Security notice */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-3">
            {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, {
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
                {React.createElement(FaUserEdit as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
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
                  {React.createElement(FaUserPlus as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
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
                        {!member.isSelf && member.permissionsSharedWithMe && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {Object.values(member.permissionsSharedWithMe).every(Boolean)
                              ? 'Compartilha acesso total com você'
                              : Object.values(member.permissionsSharedWithMe).some(Boolean)
                                ? 'Compartilha acesso personalizado com você'
                                : 'Ocultou todos os dados individuais para você'}
                          </p>
                        )}
                      </div>

                      {waUrl && !member.isSelf && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 text-xs font-medium transition-colors"
                        >
                          {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                          WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Permissões e Controle de Privacidade no Painel Família */}
          {otherMembers.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    {React.createElement(
                      FaLock as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-[11px] text-slate-600' },
                    )}
                    O que os participantes podem ver do seu painel
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Defina acesso total a todos ou personalize por membro o acesso a renda,
                    investimentos, despesas, saldo e reservas.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={savingPrivacy}
                  onClick={handleGrantFullAccessToAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 self-start sm:self-center flex-shrink-0"
                >
                  {React.createElement(
                    FaCheckDouble as unknown as React.ComponentType<{ className?: string }>,
                    { className: 'text-[11px]' },
                  )}
                  Acesso total a todos
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Modo de compartilhamento do meu painel
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {fullAccessAll
                      ? 'Acesso total ativo: todos no Painel Família veem todas as suas informações.'
                      : 'Modo personalizado ativo: cada membro vê somente o que você marcar abaixo.'}
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setFullAccessAll(true)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      fullAccessAll ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullAccessAll(false)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      !fullAccessAll ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por usuário
                  </button>
                </div>
              </div>

              {!fullAccessAll && (
                <div className="space-y-3">
                  {otherMembers.map((member) => {
                    const rule = rulesByMember[member.userId] || FULL_PERMISSIONS;
                    return (
                      <div
                        key={`perm-${member.userId}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">
                              O que <span className="underline">{member.name}</span> pode ver
                            </p>
                            <p className="text-[11px] text-slate-400">CPF: {member.maskedCpf}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePresetMember(member.userId, true)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition-colors"
                            >
                              Liberar tudo
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePresetMember(member.userId, false)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                            >
                              Ocultar tudo
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {PERMISSION_FIELDS.map((field) => {
                            const checked = rule[field.key];
                            return (
                              <label
                                key={field.key}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 cursor-pointer select-none"
                              >
                                <span className="text-xs font-medium text-slate-700">
                                  {field.label}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    handleToggleMemberPermission(member.userId, field.key)
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingPrivacy}
                  onClick={() => savePrivacy(fullAccessAll, rulesByMember)}
                  className="exec-btn-primary text-xs"
                >
                  {savingPrivacy ? 'Salvando...' : 'Salvar permissões de acesso'}
                </button>
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
                        {React.createElement(FaClock as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px] text-amber-600' })}
                        CPF: {inv.inviteeMaskedCpf} · Aguardando aceite
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(inv.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Cancelar convite"
                    >
                      {React.createElement(FaTrash as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
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
                {React.createElement(FaSignOutAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
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
