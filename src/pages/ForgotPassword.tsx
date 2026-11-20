import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelopeOpenText,
  FaExclamationTriangle,
  FaKey,
  FaShieldAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCpfInput, onlyDigits } from '../utils/formatters';

interface ForgotPasswordLocationState {
  identifier?: string;
  reason?: 'cpf_exists' | 'reactivate';
}

const ForgotPassword: React.FC = () => {
  const location = useLocation();
  const state = (location.state as ForgotPasswordLocationState | null) || {};

  const [identifier, setIdentifier] = useState<string>(state.identifier || '');
  const [sent, setSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [isDeactivated, setIsDeactivated] = useState(state.reason === 'reactivate');
  const [loading, setLoading] = useState(false);

  const handleIdentifierChange = (raw: string) => {
    if (!raw.includes('@') && /^[\d.\-\s]*$/.test(raw)) {
      setIdentifier(formatCpfInput(raw));
    } else {
      setIdentifier(raw);
    }
  };

  const handleSendFirebaseEmail = async (e: React.FormEvent) => {
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
        mode: state.reason === 'reactivate' ? 'reactivate' : 'reset',
      });

      setMaskedEmail(response.data?.maskedEmail || null);
      if (typeof response.data?.isDeactivated === 'boolean') {
        setIsDeactivated(response.data.isDeactivated);
      }
      setSent(true);
      toast.success(
        response.data?.message ||
          'E-mail oficial do Firebase enviado! Verifique sua caixa de entrada.',
      );
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(
          error,
          'Não foi possível enviar o e-mail de recuperação/reativação.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const isReactivateFlow = state.reason === 'reactivate' || isDeactivated;

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-slate-50 flex flex-col lg:flex-row">
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
          <img
            src="/logo192.png?v=4"
            alt="Finanças"
            className="w-10 h-10 rounded-xl shadow-sm object-cover"
          />
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              Finanças
            </p>
            <p className="text-[11px] text-slate-400">Executive Wealth Suite</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            {isReactivateFlow
              ? 'Reative sua conta definindo uma nova senha pelo e-mail oficial do Firebase.'
              : 'Recuperação segura de senha via e-mail oficial do Firebase.'}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Como cada CPF é uma chave única protegida no banco, você pode informar seu
            CPF ou e-mail e receber o link oficial do Google/Firebase para redefinir sua senha
            e liberar o acesso.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-300 pt-2">
            <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
            Disparo oficial Google Firebase com link seguro de uso único
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Controle Financeiro. Todos os direitos reservados.
        </p>
      </div>

      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md min-w-0">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              {React.createElement(FaArrowLeft as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
              Voltar para o login
            </Link>
          </div>

          <div className="mb-6">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4">
              {React.createElement((sent ? FaEnvelopeOpenText : FaKey) as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-base',
              })}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {isReactivateFlow ? 'Reativar conta / Nova senha' : 'Recuperar senha'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {sent
                ? 'Siga as instruções enviadas para o seu e-mail cadastrado.'
                : 'Informe o CPF ou e-mail da sua conta para receber o link oficial do Firebase.'}
            </p>
          </div>

          {state.reason === 'cpf_exists' && !sent && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-amber-600 text-sm mt-0.5 flex-shrink-0',
              })}
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold">CPF já cadastrado no sistema</p>
                <p className="mt-0.5">
                  Cada CPF é uma chave única e não pode ser duplicado. Solicite abaixo o e-mail
                  do Firebase para redefinir a senha da sua conta existente.
                </p>
              </div>
            </div>
          )}

          {state.reason === 'reactivate' && !sent && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-amber-600 text-sm mt-0.5 flex-shrink-0',
              })}
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold">Reativação de conta desativada</p>
                <p className="mt-0.5">
                  Enviaremos um e-mail oficial do Firebase com o botão/link para definir sua
                  nova senha. Assim que você salvar a nova senha e fizer login, sua conta será
                  reativada automaticamente com todos os dados preservados.
                </p>
              </div>
            </div>
          )}

          <div className="exec-card p-6 sm:p-8">
            {!sent ? (
              <form className="space-y-5" onSubmit={handleSendFirebaseEmail}>
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
                  {loading
                    ? 'Disparando e-mail...'
                    : isReactivateFlow
                      ? 'Enviar e-mail de reativação'
                      : 'Enviar e-mail de recuperação'}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 text-xs text-emerald-950">
                  {React.createElement(FaCheckCircle as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-emerald-600 text-base mt-0.5 flex-shrink-0',
                  })}
                  <div className="space-y-1.5 leading-relaxed">
                    <p className="font-semibold">E-mail enviado pelo Firebase!</p>
                    <p>
                      {maskedEmail
                        ? `Disparamos o link oficial para ${maskedEmail} (verifique também a caixa de Spam/Promoções).`
                        : 'Se a conta existir, disparamos o link oficial para o e-mail vinculado.'}
                    </p>
                    <p>
                      {isReactivateFlow
                        ? '1. Abra o e-mail e clique no link para definir sua nova senha.\n2. Volte para a tela de login e entre com a nova senha — sua conta será reativada automaticamente!'
                        : 'Abra o e-mail, clique no link para definir sua nova senha e depois volte para fazer login.'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="exec-btn-primary w-full py-3 inline-flex items-center justify-center"
                >
                  Ir para a tela de login
                </Link>

                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Enviar novamente ou informar outro CPF/e-mail
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
