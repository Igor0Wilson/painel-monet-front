import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { MemberBreakdown } from '../../types/finance';
import { buildWhatsAppUrl, formatCurrency } from '../../utils/formatters';

interface Props {
  members: MemberBreakdown[];
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
}

const FamilyMembersStrip: React.FC<Props> = ({
  members,
  selectedMemberId,
  onSelectMember,
}) => {
  if (!members.length) return null;

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

              <div className="mt-3 pt-2.5 border-t border-current/10 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Entradas
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      isSelected ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(member.totalIncome)}
                  </span>
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Saídas pagas
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(member.totalExpenses)}
                  </span>
                </div>
                <div>
                  <span
                    className={`block text-[10px] ${
                      isSelected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    Saldo VA/VR
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      isSelected ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {formatCurrency(member.foodAllowance || 0)}
                  </span>
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
