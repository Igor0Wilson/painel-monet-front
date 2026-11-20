import React from 'react';
import { FaSeedling, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  variant: 'emergency' | 'investment';
  value: string;
  maxLimit: number;
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
  loading,
  onChangeValue,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const isEmergency = variant === 'emergency';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-executive-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isEmergency
                  ? 'bg-slate-900 text-emerald-400'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {React.createElement((isEmergency ? FaShieldAlt : FaSeedling) as any, {
                className: 'text-sm',
              })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isEmergency ? 'Guardar na Reserva de Emergência' : 'Guardar em Investimentos'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEmergency
                  ? 'Defina o valor total que deseja manter protegido'
                  : 'Defina o valor total alocado nos seus investimentos'}
              </p>
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
              {isEmergency ? 'Valor da reserva (R$)' : 'Valor investido (R$)'}
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
            <p className="text-[11px] text-slate-400 mt-1.5">
              {isEmergency
                ? 'Seu limite disponível para reserva:'
                : 'Seu limite disponível para investir:'}{' '}
              <span className="font-semibold text-slate-600 tabular-nums">
                {formatCurrency(maxLimit)}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={
                isEmergency
                  ? 'exec-btn-primary'
                  : 'inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-50'
              }
            >
              {loading
                ? 'Salvando...'
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
