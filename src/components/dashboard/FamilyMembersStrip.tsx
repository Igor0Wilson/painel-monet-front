import React from 'react';
import { FaLock, FaShieldAlt, FaWhatsapp } from 'react-icons/fa';
import { MemberBreakdown } from '../../types/finance';
import { buildWhatsAppUrl, formatCurrency } from '../../utils/formatters';

interface Props {
  members: MemberBreakdown[];
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
  onOpenPrivacySettings?: () => void;
}

const FamilyMembersStrip: React.FC<Props> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenPrivacySettings,
}) => {
  if (!members.length) return null;

  const renderPrivateOrValue = (
    allowed: boolean | undefined,
    amount: number,
    isSelected: boolean,
    highlightClass: string,
  ) => {
    if (allowed === false) {
      return (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
            isSelected ? 'text-slate-400' : 'text-slate-400'
          }`}
        >
          {React.createElement(
            FaLock as unknown as React.ComponentType<{ className?: string }>,
            { className: 'text-[9px]' },
          )}
          Privado
        </span>
      );
    }
    return (
      <span className={`font-semibold tabular-nums ${highlightClass}`}>
        {formatCurrency(amount)}
      </span>
    );
  };

  return (
    <div className="exec-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Participantes do Painel Família ({members.length})
          </h2>
          <p className="text-xs text-slate-400">
            Clique em um membro para filtrar as contas e compras dele na listagem abaixo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onOpenPrivacySettings && (
            <button
              type="button"
              onClick={onOpenPrivacySettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              {React.createElement(
                FaShieldAlt as unknown as React.ComponentType<{ className?: string }>,
                { className: 'text-[11px] text-emerald-600' },
              )}
              Permissões &amp; Privacidade
            </button>
          )}
          {selectedMemberId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectMember('all')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 underline"
            >
              Mostrar todos da família
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member) => {
          const isSelected = selectedMemberId === member.userId;
          const waUrl = buildWhatsAppUrl(member.phone);

          return (
            <div
              key={member.userId}
              onClick={() => onSelectMember(isSelected ? 'all' : member.userId)}
              className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {member.name} {member.isSelf ? '(Você)' : ''}
                  </p>
                  <p
                    className={`text-[11px] tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    CPF: {member.maskedCpf}
                  </p>
                </div>
                {waUrl && !member.isSelf && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-white/10 text-emerald-300 hover:bg-white/20'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title={`Enviar WhatsApp para ${member.name}`}
                  >
                    {React.createElement(FaWhatsapp as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                  </a>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Entradas
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewIncome,
                    member.totalIncome,
                    isSelected,
                    isSelected ? 'text-emerald-300' : 'text-emerald-700',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Saídas pagas
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewExpenses,
                    member.totalExpenses,
                    isSelected,
                    '',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Investimentos
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewInvestments,
                    member.investments,
                    isSelected,
                    isSelected ? 'text-emerald-300' : 'text-emerald-700',
                  )}
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Saldo VA/VR
                  </span>
                  {renderPrivateOrValue(
                    member.permissions?.viewFoodAllowance,
                    member.foodAllowance || 0,
                    isSelected,
                    isSelected ? 'text-amber-300' : 'text-amber-700',
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FamilyMembersStrip;
