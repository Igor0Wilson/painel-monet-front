import React from 'react';
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

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pago · Pix',
  debito: 'Pago · Débito',
  dinheiro: 'Pago · Dinheiro',
  va: 'Pago · VA',
  vr: 'Pago · VR',
};

const StatusBadge: React.FC<Props> = ({ status, paymentMethod }) => {
  if (status === 'pago') {
    if (paymentMethod === 'credito') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
          Pago no Crédito
        </span>
      );
    }

    const label = (paymentMethod && METHOD_LABELS[paymentMethod]) || 'Pago';
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
        {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
        {label}
      </span>
    );
  }

  if (status === 'em_atraso') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
        {React.createElement(FaExclamationCircle as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
        Em atraso
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
      {React.createElement(FaClock as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
      Pendente
    </span>
  );
};

export default StatusBadge;
