import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaKey,
  FaLandmark,
  FaShieldAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCpfInput, onlyDigits } from '../utils/formatters';

interface ForgotPasswordLocationState {
  identifier?: string;
  reason?: string;
}

const ForgotPassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as ForgotPasswordLocationState | null) || {};

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState<string>(state.identifier || '');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIdentifierChange = (raw: string) => {
    if (!raw.includes('@') && /^[\d.\-\s]*$/.test(raw)) {
      setIdentifier(formatCpfInput(raw));
    } else {
      setIdentifier(raw);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      toast.error('Informe seu e-mail ou CPF cadastrado.');
      return;
    }

    try {
      setLoading(true);
      const payloadIdentifier = trimmed.includes('@')
        ? trimmed.toLowerCase()
        : onlyDigits(trimmed);

      const response = await api.post('/auth/forgot-password', {
        identifier: payloadIdentifier,
      });

      setMaskedEmail(response.data?.maskedEmail || null);
      setDevCode(response.data?.devCode || null);
      toast.success(
        response.data?.message ||
          'Se a conta existir, enviamos um código de recuperação.',
      );
      setStep('reset');
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, 'Erro ao solicitar recuperação de senha'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = onlyDigits(code);
    if (cleanCode.length !== 6) {
      toast.error('Informe o código de 6 dígitos enviado para seu e-mail.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    try {
      setLoading(true);
      const trimmed = identifier.trim();
      const payloadIdentifier = trimmed.includes('@')
        ? trimmed.toLowerCase()
        : onlyDigits(trimmed);

      const response = await api.post('/auth/reset-password', {
        identifier: payloadIdentifier,
        code: cleanCode,
        newPassword,
      });

      toast.success(
        response.data?.message || 'Senha redefinida com sucesso!',
      );
      navigate('/login');
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(error, 'Não foi possível redefinir a senha'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-[46%] bg-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center shadow-sm">
            {React.createElement(FaLandmark as any, { className: 'text-base' })}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              Controle Financeiro
            </p>
            <p className="text-[11px] text-slate-400">Executive Wealth Suite</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            Recuperação segura de acesso vinculada ao seu CPF e e-mail.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Como cada CPF é uma chave única no sistema, você pode recuperar sua conta
            com segurança usando um código temporário de 6 dígitos.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-300 pt-2">
            <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              {React.createElement(FaShieldAlt as any, { className: 'text-xs' })}
            </span>
            Código temporário válido por 15 minutos com proteção contra tentativas
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Controle Financeiro. Todos os direitos reservados.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              {React.createElement(FaArrowLeft as any, { className: 'text-[10px]' })}
              Voltar para o login
            </Link>
          </div>

          <div className="mb-6">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4">
              {React.createElement(FaKey as any, { className: 'text-base' })}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Recuperar senha
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {step === 'request'
                ? 'Informe o CPF ou e-mail da sua conta para receber o código de recuperação.'
                : 'Digite o código de 6 dígitos e escolha sua nova senha.'}
            </p>
          </div>

          {state.reason === 'cpf_exists' && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              {React.createElement(FaExclamationTriangle as any, {
                className: 'text-amber-600 text-sm mt-0.5 flex-shrink-0',
              })}
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold">CPF já cadastrado no sistema</p>
                <p className="mt-0.5">
                  Cada CPF é uma chave única e não pode ser duplicado. Solicite abaixo o código
                  para recuperar o acesso à sua conta existente.
                </p>
              </div>
            </div>
          )}

          <div className="exec-card p-6 sm:p-8">
            {step === 'request' ? (
              <form className="space-y-5" onSubmit={handleRequestCode}>
                <div>
                  <label htmlFor="identifier" className="exec-label">
                    CPF ou E-mail cadastrado
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    className="exec-input"
                    placeholder="000.000.000-00 ou nome@gmail.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="exec-btn-primary w-full py-3"
                >
                  {loading ? 'Enviando código...' : 'Enviar código de recuperação'}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                  {React.createElement(FaCheckCircle as any, {
                    className: 'text-emerald-600 text-sm mt-0.5 flex-shrink-0',
                  })}
                  <div>
                    <p className="font-semibold">Solicitação registrada</p>
                    <p className="mt-0.5">
                      {maskedEmail
                        ? `Enviamos o código de 6 dígitos para ${maskedEmail}.`
                        : 'Verifique a caixa de entrada do e-mail vinculado à sua conta.'}
                    </p>
                  </div>
                </div>

                {devCode && (
                  <div className="rounded-xl bg-slate-100 border border-slate-300 p-3 text-xs text-slate-800">
                    <span className="font-semibold">Ambiente local (dev):</span> código gerado{' '}
                    <strong className="font-mono text-sm tracking-widest">{devCode}</strong>
                  </div>
                )}

                <div>
                  <label htmlFor="recovery-code" className="exec-label">
                    Código de 6 dígitos
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 6))}
                    className="exec-input font-mono text-center tracking-[0.4em] text-base"
                    placeholder="000000"
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="exec-label">
                    Nova senha
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="exec-input"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="exec-label">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="exec-input"
                    placeholder="Repita a nova senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="exec-btn-primary w-full py-3"
                >
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 pt-1"
                >
                  Reenviar código ou trocar CPF/e-mail
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
