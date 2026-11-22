import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaAdjust,
  FaCheckCircle,
  FaCreditCard,
  FaExclamationCircle,
} from 'react-icons/fa';

interface Props {
  status: string;
  paymentMethod?: string | null;
  isPartiallyPaid?: boolean;
}

const VALID_METHODS = new Set(['pix', 'debito', 'dinheiro', 'va', 'vr']);

const StatusBadge: React.FC<Props> = ({
  status,
  paymentMethod,
  isPartiallyPaid = false,
}) => {
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

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {status === 'em_atraso' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60">
          {React.createElement(FaExclamationCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          {t('status.em_atraso')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60">
          {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          {t('status.pendente')}
        </span>
      )}
      {isPartiallyPaid && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60">
          {React.createElement(FaAdjust as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          {t('status.partialPaid')}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
