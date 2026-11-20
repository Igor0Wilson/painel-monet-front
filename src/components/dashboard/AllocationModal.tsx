import React from 'react';
import { FaSeedling, FaShieldAlt, FaTimes, FaUtensils } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  variant: 'emergency' | 'investment' | 'food';
  value: string;
  maxLimit: number;
  usedAmount?: number;
  loading: boolean;
  onChangeValue: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AllocationModal: React.FC<Props> = ({
  isOpen,
  variant,
  value,
  maxLimit,
  usedAmount = 0,
  loading,
  onChangeValue,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const isEmergency = variant === 'emergency';
  const isFood = variant === 'food';

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
              {React.createElement(IconComp as any, {
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
            {React.createElement(FaTimes as any, { className: 'text-sm' })}
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
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                As despesas de <strong>Alimentação</strong> e <strong>FastFood</strong> pagas com{' '}
                <strong>VA</strong> ou <strong>VR</strong> descontam automaticamente deste saldo
                {usedAmount > 0 ? ` (já utilizado: ${formatCurrency(usedAmount)})` : ''}.
              </p>
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
