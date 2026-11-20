import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimes, FaUserShield } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { extractApiErrorMessage, getApiErrorCode } from '../../utils/errorHandler';
import { formatCpfInput, formatPhoneInput, onlyDigits } from '../../utils/formatters';

export interface GooglePendingProfile {
  completionToken: string;
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
}

interface GoogleCompleteProfileModalProps {
  pending: GooglePendingProfile | null;
  onClose: () => void;
}

const GoogleCompleteProfileModal: React.FC<GoogleCompleteProfileModalProps> = ({
  pending,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cpfConflictMessage, setCpfConflictMessage] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (pending) {
      setName(pending.name || '');
      setCpf(pending.cpf ? formatCpfInput(pending.cpf) : '');
      setPhone(pending.phone ? formatPhoneInput(pending.phone) : '');
      setCpfConflictMessage(null);
    }
  }, [pending]);

  if (!pending) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpfConflictMessage(null);

    const trimmedName = name.trim();
    const cpfDigits = onlyDigits(cpf);
    const phoneDigits = onlyDigits(phone);

    if (trimmedName.length < 2) {
      toast.error('Informe seu nome completo.');
      return;
    }
    if (cpfDigits.length !== 11) {
      toast.error('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (phoneDigits.length < 10) {
      toast.error('Informe um telefone/WhatsApp válido com DDD.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/auth/google/complete', {
        completionToken: pending.completionToken,
        name: trimmedName,
        cpf: cpfDigits,
        phone: phoneDigits,
      });

      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Cadastro concluído com sua conta Google!');
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const code = getApiErrorCode(error);
      const message = extractApiErrorMessage(error, 'Erro ao concluir cadastro com Google');

      if (code === 'CPF_ALREADY_EXISTS' || message.toLowerCase().includes('cpf já está')) {
        setCpfConflictMessage(
          'Este CPF já está cadastrado em outra conta. Redirecionando para recuperação de senha...',
        );
        toast.warning('Este CPF já existe. Redirecionando para recuperação de senha...');
        setTimeout(() => {
          onClose();
          navigate('/forgot-password', {
            state: { identifier: formatCpfInput(cpfDigits), reason: 'cpf_exists' },
          });
        }, 1800);
        return;
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-md">
        <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              {React.createElement(FaUserShield as unknown as React.ComponentType<{ className?: string }>, { className: 'text-base' })}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Complete seu cadastro</h3>
              <p className="text-xs text-slate-400">
                Nome, CPF e telefone são obrigatórios para segurança da conta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                E-mail carregado do Gmail
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">{pending.email}</p>
            </div>
            {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
              className: 'text-emerald-600 text-base flex-shrink-0',
            })}
          </div>

          {cpfConflictMessage && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
              {cpfConflictMessage}
            </div>
          )}

          <div>
            <label htmlFor="google-name" className="exec-label">
              Nome completo *
            </label>
            <input
              id="google-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="exec-input"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label htmlFor="google-cpf" className="exec-label">
              CPF * (chave única de segurança)
            </label>
            <input
              id="google-cpf"
              type="text"
              inputMode="numeric"
              required
              value={cpf}
              onChange={(e) => setCpf(formatCpfInput(e.target.value))}
              className="exec-input tabular-nums"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label htmlFor="google-phone" className="exec-label">
              Telefone / WhatsApp *
            </label>
            <input
              id="google-phone"
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="exec-input tabular-nums"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 exec-btn-primary py-2.5"
            >
              {submitting ? 'Validando...' : 'Concluir acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleCompleteProfileModal;
