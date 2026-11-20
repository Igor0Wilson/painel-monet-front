import React from 'react';
import { FaCalendarAlt, FaSeedling, FaShieldAlt, FaTimes, FaUtensils } from 'react-icons/fa';
import { formatCurrency, formatDateBr } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  variant: 'emergency' | 'investment' | 'food';
  value: string;
  creditDate?: string;
  isRecurring?: boolean;
  maxLimit: number;
  usedAmount?: number;
  loading: boolean;
  onChangeValue: (val: string) => void;
  onChangeCreditDate?: (date: string) => void;
  onChangeIsRecurring?: (recurring: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const AllocationModal: React.FC<Props> = ({
  isOpen,
  variant,
  value,
  creditDate = getTodayIso(),
  isRecurring = true,
  maxLimit,
  usedAmount = 0,
  loading,
  onChangeValue,
  onChangeCreditDate,
  onChangeIsRecurring,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const isEmergency = variant === 'emergency';
  const isFood = variant === 'food';
  const todayIso = getTodayIso();
  const isFutureDate = Boolean(isFood && creditDate && creditDate > todayIso);

  const IconComp = isFood ? FaUtensils : isEmergency ? FaShieldAlt : FaSeedling;
  const headerBadgeClass = isFood
    ? 'bg-amber-500 text-slate-950'
    : isEmergency
      ? 'bg-slate-900 text-emerald-400'
      : 'bg-emerald-600 text-white';

  const titleText = isFood
    ? 'Vale Alimentação / Refeição (VA / VR)'
    : isEmergency
      ? 'Guardar na Reserva de Emergência'
      : 'Guardar em Investimentos';

  const subtitleText = isFood
    ? 'Defina o valor total do seu benefício VA/VR (individual e somado na família)'
    : isEmergency
      ? 'Defina o valor total que deseja manter protegido'
      : 'Defina o valor total alocado nos seus investimentos';

  return (
    <div className="exec-modal-overlay z-[60]">
      <div className="exec-modal-container max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${headerBadgeClass}`}
            >
              {React.createElement(IconComp as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-sm',
              })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{titleText}</h3>
              <p className="text-xs text-slate-500">{subtitleText}</p>
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

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div>
            <label className="exec-label">
              {isFood
                ? 'Valor total do seu Vale Alimentação / Refeição (R$)'
                : isEmergency
                  ? 'Valor da reserva (R$)'
                  : 'Valor investido (R$)'}
            </label>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => onChangeValue(e.target.value)}
              className="exec-input tabular-nums font-semibold"
              placeholder="0,00"
            />
            {isFood ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="exec-label flex items-center gap-1.5">
                    {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-[10px] text-slate-400',
                    })}
                    Data em que o VA / VR vai cair
                  </label>
                  <input
                    type="date"
                    value={creditDate}
                    onChange={(e) => onChangeCreditDate?.(e.target.value)}
                    className="exec-input"
                    required
                  />
                </div>

                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => onChangeIsRecurring?.(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        isRecurring ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        isRecurring ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    Benefício fixo mensal (cai todo mês nesse dia)
                  </span>
                </label>

                <div
                  className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                    isFutureDate
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  }`}
                >
                  {isFutureDate ? (
                    <>
                      <strong>Agendado para {formatDateBr(creditDate)}:</strong> o valor ficará como{' '}
                      <strong>A cair</strong> e só será somado ao saldo lá em cima quando chegar o dia{' '}
                      <strong>{formatDateBr(creditDate)}</strong> (igual ao salário).
                    </>
                  ) : (
                    <>
                      Como a data <strong>{formatDateBr(creditDate)}</strong> já chegou, o valor será
                      contabilizado imediatamente no seu saldo de{' '}
                      <strong>Vale Alimentação / Refeição</strong>
                      {usedAmount > 0 ? ` (já utilizado: ${formatCurrency(usedAmount)})` : ''}.
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5">
                {isEmergency
                  ? 'Seu limite disponível para reserva:'
                  : 'Seu limite disponível para investir:'}{' '}
                <span className="font-semibold text-slate-600 tabular-nums">
                  {formatCurrency(maxLimit)}
                </span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={
                isFood
                  ? 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-sm transition-all disabled:opacity-50'
                  : isEmergency
                    ? 'exec-btn-primary'
                    : 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50'
              }
            >
              {loading
                ? 'Salvando...'
                : isFood
                  ? 'Salvar VA / VR'
                  : isEmergency
                    ? 'Confirmar valor'
                    : 'Confirmar investimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocationModal;
