import React from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaLandmark,
  FaPiggyBank,
  FaSeedling,
  FaShieldAlt,
} from 'react-icons/fa';
import { BalanceData } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  balance: BalanceData;
  incomesCount: number;
  isFamilyMode: boolean;
  onOpenEmergencyModal: () => void;
  onOpenInvestmentModal: () => void;
}

const KpiGrid: React.FC<Props> = ({
  balance,
  incomesCount,
  isFamilyMode,
  onOpenEmergencyModal,
  onOpenInvestmentModal,
}) => {
  const netFlow = balance.totalIncome - balance.totalExpenses;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-executive-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-slate-800" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">
              {isFamilyMode ? 'Patrimônio Disponível da Família' : 'Patrimônio Disponível'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center">
              {React.createElement(FaLandmark as any, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(balance.balance)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Saldo livre após despesas pagas, reserva e investimentos
          </p>
        </div>

        <div className="exec-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500">
              {isFamilyMode ? 'Receitas Totais da Família' : 'Receitas Creditadas'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              {React.createElement(FaArrowUp as any, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(balance.totalIncome)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            {balance.scheduledIncome > 0 ? (
              <>
                A receber:{' '}
                <span className="font-semibold text-amber-700 tabular-nums">
                  {formatCurrency(balance.scheduledIncome)}
                </span>
              </>
            ) : (
              <>
                {incomesCount} {incomesCount === 1 ? 'fonte registrada' : 'fontes registradas'}
              </>
            )}
          </p>
        </div>

        <div className="exec-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-500">
              {isFamilyMode ? 'Despesas Liquidadas da Família' : 'Despesas Liquidadas'}
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              {React.createElement(FaArrowDown as any, { className: 'text-xs' })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(balance.totalExpenses)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Fluxo líquido:{' '}
            <span
              className={`font-semibold tabular-nums ${
                netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(netFlow)}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="exec-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                {React.createElement(FaShieldAlt as any, { className: 'text-xs' })}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isFamilyMode ? 'Reserva de Emergência da Família' : 'Reserva de Emergência'}
              </span>
            </div>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(balance.emergencyFund)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isFamilyMode
                ? `Sua parte alocada: ${formatCurrency(balance.ownEmergencyFund || 0)}`
                : 'Proteção patrimonial separada do saldo livre'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenEmergencyModal}
            aria-label="Guardar na reserva de emergência"
            className="w-full sm:w-auto min-w-[148px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
          >
            {React.createElement(FaPiggyBank as any, { className: 'text-sm text-emerald-400' })}
            <span>Guardar</span>
          </button>
        </div>

        <div className="exec-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                {React.createElement(FaSeedling as any, { className: 'text-xs' })}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isFamilyMode ? 'Investimentos da Família' : 'Investimentos'}
              </span>
            </div>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(balance.investments || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isFamilyMode
                ? `Sua parte investida: ${formatCurrency(balance.ownInvestments || 0)}`
                : 'Capital alocado para rentabilidade e metas'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenInvestmentModal}
            aria-label="Guardar em investimentos"
            className="w-full sm:w-auto min-w-[148px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all"
          >
            {React.createElement(FaSeedling as any, { className: 'text-sm' })}
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KpiGrid;
