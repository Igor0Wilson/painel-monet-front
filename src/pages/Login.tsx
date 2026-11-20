import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaChartLine,
  FaLayerGroup,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  consumeGoogleRedirectResult,
  signInWithEmailFirebase,
  signInWithGooglePopup,
  signOutFirebase,
  translateFirebaseAuthError,
} from '../services/firebaseAuth';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleCompleteProfileModal, {
  GooglePendingProfile,
} from '../components/auth/GoogleCompleteProfileModal';
import InstallAppBanner from '../components/InstallAppBanner';
import { extractApiErrorMessage, getApiErrorCode } from '../utils/errorHandler';

const schema = yup
  .object({
    email: yup.string().email('E-mail inválido').required('Campo obrigatório'),
    password: yup.string().min(6, 'Mínimo 6 caracteres').required('Campo obrigatório'),
  })
  .required();

type FormData = yup.InferType<typeof schema>;

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePending, setGooglePending] = useState<GooglePendingProfile | null>(null);
  const [deactivatedEmail, setDeactivatedEmail] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('reactivated') === '1') {
      toast.success(
        'Nova senha definida! Faça login agora com seu e-mail e nova senha para reativar sua conta.',
      );
    } else if (searchParams.get('passwordReset') === '1') {
      toast.success('Senha redefinida pelo Firebase! Faça login com sua nova senha.');
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    consumeGoogleRedirectResult().then(async (redirectResult) => {
      if (!active || !redirectResult) return;
      try {
        setGoogleLoading(true);
        const response = await api.post('/auth/firebase-login', {
          idToken: redirectResult.idToken,
        });
        if (response.data?.requiresProfileCompletion) {
          setGooglePending({
            completionToken: response.data.completionToken,
            email: response.data.googleProfile?.email || redirectResult.email,
            name: response.data.googleProfile?.name || redirectResult.displayName,
            cpf: response.data.googleProfile?.cpf || '',
            phone: response.data.googleProfile?.phone || '',
          });
          return;
        }
        const { access_token, user, reactivated } = response.data;
        login(access_token, user);
        toast.success(
          reactivated
            ? 'Conta reativada com sucesso! Bem-vindo de volta.'
            : 'Acesso autorizado via Google.',
        );
        navigate('/dashboard', { replace: true });
      } catch (error: unknown) {
        const apiCode = getApiErrorCode(error);
        if (apiCode === 'ACCOUNT_DEACTIVATED') {
          await signOutFirebase();
          setDeactivatedEmail(redirectResult.email);
          return;
        }
        await signOutFirebase();
        toast.error(extractApiErrorMessage(error, 'Erro ao autenticar com Google'));
      } finally {
        if (active) setGoogleLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [login, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setDeactivatedEmail(null);
    try {
      setLoading(true);
      const fbResult = await signInWithEmailFirebase(data.email, data.password);
      const response = await api.post('/auth/firebase-login', {
        idToken: fbResult.idToken,
      });

      const { access_token, user, reactivated } = response.data;
      login(access_token, user);
      toast.success(
        reactivated
          ? 'Conta reativada com sucesso! Bem-vindo de volta.'
          : 'Acesso autorizado.',
      );
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        setDeactivatedEmail(data.email.trim().toLowerCase());
        toast.warning(
          'Sua conta está desativada. Reative pelo e-mail de redefinição de senha.',
        );
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, 'Erro ao realizar login');
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(extractApiErrorMessage(error, 'Erro ao realizar login'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setDeactivatedEmail(null);
    let googleEmail = '';
    try {
      setGoogleLoading(true);
      const googleResult = await signInWithGooglePopup();
      googleEmail = googleResult.email;
      const response = await api.post('/auth/firebase-login', {
        idToken: googleResult.idToken,
      });

      if (response.data?.requiresProfileCompletion) {
        setGooglePending({
          completionToken: response.data.completionToken,
          email: response.data.googleProfile?.email || googleResult.email,
          name: response.data.googleProfile?.name || googleResult.displayName,
          cpf: response.data.googleProfile?.cpf || '',
          phone: response.data.googleProfile?.phone || '',
        });
        return;
      }

      const { access_token, user, reactivated } = response.data;
      login(access_token, user);
      toast.success(
        reactivated
          ? 'Conta reativada com sucesso! Bem-vindo de volta.'
          : 'Acesso autorizado via Google.',
      );
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        setDeactivatedEmail(googleEmail);
        toast.warning(
          'Sua conta está desativada. Solicite o e-mail de reativação para voltar a acessar.',
        );
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, 'Erro ao entrar com Google');
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(extractApiErrorMessage(error, 'Erro ao entrar com Google'));
    } finally {
      setGoogleLoading(false);
    }
  };

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
            <p className="text-sm font-semibold tracking-tight text-white">Finanças</p>
            <p className="text-[11px] text-slate-400">Executive Wealth Suite</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            Clareza executiva sobre seu patrimônio, salários e compromissos.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Acompanhe fluxo de caixa, múltiplos salários ou adiantamentos quinzenais, despesas
            parceladas e sua reserva de emergência em um único painel.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaChartLine as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              Projeção mensal e distribuição de gastos em tempo real
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaLayerGroup as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              Suporte a múltiplos salários, adiantamento quinzenal e parcelas
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaShieldAlt as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              </span>
              Autenticação Firebase + CPF único validado no banco de dados
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Controle Financeiro. Todos os direitos reservados.
        </p>
      </div>

      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md min-w-0">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <img
              src="/logo192.png?v=4"
              alt="Finanças"
              className="w-9 h-9 rounded-xl flex-shrink-0 object-cover shadow-sm"
            />
            <span className="text-base font-semibold text-slate-900 truncate">
              Finanças
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Acessar painel
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Entre com sua conta Gmail ou e-mail e senha cadastrados.
            </p>
          </div>

          <div className="exec-card p-5 sm:p-8 w-full">
            {deactivatedEmail && (
              <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                {React.createElement(FaExclamationTriangle as unknown as React.ComponentType<{ className?: string }>, {
                  className: 'text-amber-600 text-sm mt-0.5 flex-shrink-0',
                })}
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold">Sua conta está desativada</p>
                  <p className="mt-0.5">
                    Para reativar, enviaremos um e-mail oficial do Firebase para você definir uma
                    nova senha e liberar o acesso.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/forgot-password', {
                        state: { identifier: deactivatedEmail, reason: 'reactivate' },
                      })
                    }
                    className="mt-2 inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                  >
                    Enviar e-mail de reativação
                  </button>
                </div>
              </div>
            )}

            <GoogleSignInButton
              onClick={handleGoogleLogin}
              loading={googleLoading}
              label="Entrar com Google (Gmail)"
            />

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-medium">
                  ou acesse com e-mail e senha
                </span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="exec-label">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
                  placeholder="nome@empresa.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="exec-label">
                    Senha
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 mb-1.5"
                  >
                    Esqueci senha / Reativar conta
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className={`exec-input pr-10 ${errors.password ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {React.createElement((showPassword ? FaEyeSlash : FaEye) as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-sm',
                    })}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="exec-btn-primary w-full py-3 mt-2"
              >
                {loading ? 'Autenticando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Ainda não possui conta?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-slate-900 hover:underline underline-offset-4"
                >
                  Criar acesso
                </Link>
              </p>
            </div>
          </div>

          <InstallAppBanner />
        </div>
      </div>

      <GoogleCompleteProfileModal
        pending={googlePending}
        onClose={() => setGooglePending(null)}
      />
    </div>
  );
};

export default Login;
