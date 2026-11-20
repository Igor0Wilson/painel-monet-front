import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import { FaLandmark, FaEye, FaEyeSlash, FaShieldAlt, FaChartLine, FaLayerGroup } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { signInWithGooglePopup } from '../services/firebaseAuth';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleCompleteProfileModal, {
  GooglePendingProfile,
} from '../components/auth/GoogleCompleteProfileModal';
import { extractApiErrorMessage } from '../utils/errorHandler';

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
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', data);
      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Acesso autorizado.');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao realizar login'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const googleResult = await signInWithGooglePopup();
      const response = await api.post('/auth/google', {
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

      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Acesso autorizado via Google.');
      navigate('/dashboard');
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      toast.error(extractApiErrorMessage(error, 'Erro ao entrar com Google'));
    } finally {
      setGoogleLoading(false);
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
            <p className="text-sm font-semibold tracking-tight text-white">Controle Financeiro</p>
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
                {React.createElement(FaChartLine as any, { className: 'text-xs' })}
              </span>
              Projeção mensal e distribuição de gastos em tempo real
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaLayerGroup as any, { className: 'text-xs' })}
              </span>
              Suporte a múltiplos salários, adiantamento quinzenal e parcelas
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                {React.createElement(FaShieldAlt as any, { className: 'text-xs' })}
              </span>
              Dados isolados por usuário com CPF único e autenticação segura
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Controle Financeiro. Todos os direitos reservados.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {React.createElement(FaLandmark as any, { className: 'text-sm' })}
            </div>
            <span className="text-base font-semibold text-slate-900">Controle Financeiro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Acessar painel
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Insira suas credenciais ou entre com sua conta Gmail.
            </p>
          </div>

          <div className="exec-card p-6 sm:p-8">
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
                    Esqueci minha senha
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
                    {React.createElement((showPassword ? FaEyeSlash : FaEye) as any, {
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
