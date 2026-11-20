import React from 'react';
import { FaCheckCircle, FaCreditCard } from 'react-icons/fa';
import { CreditCardInvoiceGroup } from '../PayCreditCardModal';
import { formatCurrency, formatDateBr } from '../../utils/formatters';

interface Props {
  invoices: CreditCardInvoiceGroup[];
  activeInvoice: CreditCardInvoiceGroup | null;
  onSelectMonth: (month: string) => void;
  onPayInvoice: (invoice: CreditCardInvoiceGroup) => void;
}

const CreditCardInvoicePanel: React.FC<Props> = ({
  invoices,
  activeInvoice,
  onSelectMonth,
  onPayInvoice,
}) => {
  if (!activeInvoice) return null;

  return (
    <section className="exec-card overflow-hidden">
      <div className="px-6 py-4 bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            {React.createElement(FaCreditCard as any, { className: 'text-sm' })}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Fatura do Cartão de Crédito</h2>
            <p className="text-[11px] text-slate-400">
              Quite todas as suas compras e parcelas do cartão do mês selecionado de uma só vez
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[11px] text-slate-400 block">
            Total {activeInvoice.shortLabel}
          </span>
          <span className="text-lg font-semibold tabular-nums text-white">
            {formatCurrency(activeInvoice.total)}
          </span>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
        {invoices.map((inv) => {
          const isSelected = inv.month === activeInvoice.month;
          return (
            <button
              key={inv.month}
              type="button"
              onClick={() => onSelectMonth(inv.month)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <span>{inv.shortLabel}</span>
              <span
                className={`tabular-nums text-[11px] ${
                  isSelected ? 'text-emerald-300' : 'text-slate-400'
                }`}
              >
                {formatCurrency(inv.total)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
          {activeInvoice.items.map((item) => (
            <div
              key={item.id}
              className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-[11px] text-slate-400">
                  {item.accountType?.name || 'Cartão de Crédito'} · Venc.{' '}
                  {formatDateBr(item.dueDate)}
                </p>
              </div>
              <span className="font-semibold text-slate-900 tabular-nums flex-shrink-0">
                {formatCurrency(Number(item.value))}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            {activeInvoice.items.length}{' '}
            {activeInvoice.items.length === 1 ? 'lançamento em aberto' : 'lançamentos em aberto'}{' '}
            em <strong>{activeInvoice.label}</strong>
          </p>
          <button
            type="button"
            onClick={() => onPayInvoice(activeInvoice)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {React.createElement(FaCheckCircle as any, { className: 'text-xs' })}
            <span>
              Pagar Fatura de {activeInvoice.shortLabel} ({formatCurrency(activeInvoice.total)})
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CreditCardInvoicePanel;
