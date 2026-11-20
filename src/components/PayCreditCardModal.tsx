import React, { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FaTimes,
  FaCreditCard,
  FaQrcode,
  FaUniversity,
  FaMoneyBillWave,
  FaCheckCircle,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type { ExpenseItem } from '../types/finance';
import { extractApiErrorMessage } from '../utils/errorHandler';

export interface CreditCardInvoiceGroup {
  month: string;
  label: string;
  shortLabel: string;
  total: number;
  items: ExpenseItem[];
}

interface Props {
  invoice: CreditCardInvoiceGroup | null;
  onClose: () => void;
  onSuccess: () => void;
}

type CashMethod = 'pix' | 'debito' | 'dinheiro';

const PayCreditCardModal: React.FC<Props> = ({ invoice, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<CashMethod>('pix');
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const methods: { id: CashMethod; label: string; icon: IconType }[] = [
    { id: 'pix', label: 'Pix', icon: FaQrcode },
    { id: 'debito', label: 'Débito', icon: FaUniversity },
    { id: 'dinheiro', label: 'Dinheiro', icon: FaMoneyBillWave },
  ];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/expenses/credit-card/pay-invoice', {
        month: invoice.month,
        paymentMethod,
      });
      toast.success(
        `Fatura de ${invoice.shortLabel} quitada! ${res.data.paidCount} ${res.data.paidCount === 1 ? 'lançamento liquidado' : 'lançamentos liquidados'
        }.`,
      );
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao pagar fatura do cartão'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-lg">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Pagar Fatura — {invoice.label}
              </h3>
              <p className="text-xs text-slate-500">
                Todas as compras e parcelas do cartão deste mês serão liquidadas
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

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Resumo Total */}
          <div className="rounded-xl bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                Total da fatura ({invoice.items.length}{' '}
                {invoice.items.length === 1 ? 'item' : 'itens'})
              </p>
              <p className="text-2xl font-semibold tabular-nums mt-0.5">
                {formatCurrency(invoice.total)}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium text-emerald-300">
              {invoice.shortLabel}
            </span>
          </div>

          {/* Lista de itens que serão marcados como pagos */}
          <div>
            <label className="exec-label">Lançamentos incluídos nesta fatura</label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.accountType?.name || 'Cartão de Crédito'} · Venc.{' '}
                      {formatDate(item.dueDate)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(Number(item.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Forma de pagamento da fatura */}
          <div>
            <label className="exec-label">Como a fatura foi paga?</label>
            <div className="grid grid-cols-3 gap-2.5">
              {methods.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {React.createElement(m.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              <span>{loading ? 'Liquidando...' : `Quitar Fatura (${formatCurrency(invoice.total)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayCreditCardModal;
