import React, { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FaTimes,
  FaCreditCard,
  FaMoneyBillWave,
  FaQrcode,
  FaUniversity,
  FaCheckCircle,
  FaCalendarAlt,
  FaUtensils,
  FaHamburger,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import type { ExpenseItem } from '../types/finance';
import { isFoodCategory } from '../utils/categories';
import { extractApiErrorMessage } from '../utils/errorHandler';

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'va' | 'vr';

interface Props {
  expense: ExpenseItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function getNextMonthIso(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const QUICK_INSTALLMENTS = [1, 2, 3, 6, 10, 12];

const PayExpenseModal: React.FC<Props> = ({ expense, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState<string>('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(getNextMonthIso());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (expense) {
      setPaymentMethod('pix');
      setInstallments('1');
      setFirstInstallmentDate(getNextMonthIso());
      setErrorMsg('');
    }
  }, [expense]);

  if (!expense) return null;

  const numericValue = Number(expense.value) || 0;
  const parsedInstallments = parseInt(installments, 10);
  const validInstallments = !isNaN(parsedInstallments) && parsedInstallments >= 1 ? parsedInstallments : 1;
  const perInstallment = numericValue / validInstallments;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDateBr = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const showFoodVoucherOptions = isFoodCategory(
    expense?.accountType?.name,
    expense?.name,
  );

  const methods: {
    id: PaymentMethod;
    label: string;
    subtitle: string;
    icon: IconType;
  }[] = [
      {
        id: 'pix',
        label: 'Pix',
        subtitle: 'Débito imediato',
        icon: FaQrcode,
      },
      {
        id: 'debito',
        label: 'Débito',
        subtitle: 'Saldo em conta',
        icon: FaUniversity,
      },
      {
        id: 'dinheiro',
        label: 'Dinheiro',
        subtitle: 'Pagamento em espécie',
        icon: FaMoneyBillWave,
      },
      {
        id: 'credito',
        label: 'Crédito',
        subtitle: 'Gerar fatura/parcelas',
        icon: FaCreditCard,
      },
      ...(showFoodVoucherOptions
        ? [
            {
              id: 'va' as PaymentMethod,
              label: 'VA (Vale Alimentação)',
              subtitle: 'Desconta do saldo VA/VR',
              icon: FaUtensils,
            },
            {
              id: 'vr' as PaymentMethod,
              label: 'VR (Vale Refeição)',
              subtitle: 'Desconta do saldo VA/VR',
              icon: FaHamburger,
            },
          ]
        : []),
    ];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (paymentMethod === 'credito') {
      if (isNaN(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 60) {
        setErrorMsg('Informe um número de parcelas entre 1 e 60.');
        return;
      }
      if (!firstInstallmentDate) {
        setErrorMsg('Informe a data de vencimento da primeira parcela.');
        return;
      }
    }

    try {
      setLoading(true);
      const payload: {
        paymentMethod: PaymentMethod;
        installments?: number;
        firstInstallmentDate?: string;
      } = { paymentMethod };
      if (paymentMethod === 'credito') {
        payload.installments = parsedInstallments;
        payload.firstInstallmentDate = firstInstallmentDate;
      }

      await api.patch(`/expenses/${expense.id}/pay`, payload);

      if (paymentMethod === 'credito') {
        toast.success(
          parsedInstallments > 1
            ? `Liquidado no crédito! ${parsedInstallments} parcelas geradas no Cartão de Crédito.`
            : 'Liquidado no crédito! Fatura 1/1 gerada no Cartão de Crédito.',
        );
      } else if (paymentMethod === 'va' || paymentMethod === 'vr') {
        toast.success(
          `Pagamento registrado no ${paymentMethod.toUpperCase()} e descontado do seu Vale Alimentação/Refeição!`,
        );
      } else {
        toast.success('Pagamento registrado e debitado do saldo disponível!');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao registrar pagamento'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Liquidar Despesa</h3>
              <p className="text-xs text-slate-500">
                Selecione como este pagamento foi realizado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Expense Summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Despesa selecionada</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{expense.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">Valor</p>
              <p className="text-base font-semibold text-slate-900 tabular-nums">
                {formatCurrency(numericValue)}
              </p>
            </div>
          </div>

          {/* Payment Method Grid */}
          <div>
            <label className="exec-label">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2.5">
              {methods.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      setErrorMsg('');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {React.createElement(m.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{m.label}</p>
                      <p
                        className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}
                      >
                        {m.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credit Card Details */}
          {paymentMethod === 'credito' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div className="flex items-center gap-2">
                {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-xs text-slate-700',
                })}
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Parcelamento no Cartão de Crédito
                </h4>
              </div>

              <div>
                <label className="exec-label">Em quantas vezes foi?</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {QUICK_INSTALLMENTS.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setInstallments(String(qty))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${parsedInstallments === qty
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                      {qty}x
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="exec-input tabular-nums font-semibold"
                  placeholder="Número de parcelas (ex: 3)"
                />
              </div>

              <div>
                <label className="exec-label flex items-center gap-1.5">
                  {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-[10px] text-slate-400',
                  })}
                  Data de vencimento da 1ª parcela
                </label>
                <input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={(e) => setFirstInstallmentDate(e.target.value)}
                  className="exec-input"
                />
              </div>

              {/* Preview Box */}
              <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-slate-900">
                  Nova conta no Cartão de Crédito:{' '}
                  <span className="tabular-nums text-emerald-700">
                    {validInstallments}x de {formatCurrency(perInstallment)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  1º vencimento em <strong>{formatDateBr(firstInstallmentDate)}</strong>. O valor
                  original será marcado como <strong>Pago no Crédito</strong> (sem debitar o saldo
                  agora) e cada parcela debitará o saldo quando você liquidá-la.
                </p>
              </div>
            </div>
          ) : paymentMethod === 'va' || paymentMethod === 'vr' ? (
            <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-900 leading-relaxed">
                O valor de <strong className="tabular-nums">{formatCurrency(numericValue)}</strong>{' '}
                será descontado diretamente do seu saldo de{' '}
                <strong>Vale Alimentação / Refeição ({paymentMethod.toUpperCase()})</strong>.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-4 py-3">
              <p className="text-xs text-emerald-900 leading-relaxed">
                O valor de <strong className="tabular-nums">{formatCurrency(numericValue)}</strong>{' '}
                será debitado imediatamente do seu <strong>Patrimônio Disponível</strong>.
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? 'Processando...'
                : paymentMethod === 'credito'
                  ? `Confirmar Crédito (${validInstallments}x)`
                  : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayExpenseModal;
