import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExclamationCircle,
} from 'react-icons/fa';

interface Props {
  status: string;
  paymentMethod?: string | null;
}

const VALID_METHODS = new Set(['pix', 'debito', 'dinheiro', 'va', 'vr']);

const StatusBadge: React.FC<Props> = ({ status, paymentMethod }) => {
  const { t } = useTranslation();

  if (status === 'pago') {
    if (paymentMethod === 'credito') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
          {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          {t('status.paidCreditCard')}
        </span>
      );
    }

    const label =
      paymentMethod && VALID_METHODS.has(paymentMethod)
        ? t('status.paidWithMethod', { method: t(`paymentMethods.${paymentMethod}`) })
        : t('status.pago');
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
        {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
        {label}
      </span>
    );
  }

  if (status === 'em_atraso') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60">
        {React.createElement(FaExclamationCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
        {t('status.em_atraso')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
      {React.createElement(FaClock as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
      {t('status.pendente')}
    </span>
  );
};

export default StatusBadge;
