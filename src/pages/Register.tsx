import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import { FaLandmark, FaShieldAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  consumeGoogleRedirectResult,
  registerWithEmailFirebase,
  signInWithGooglePopup,
  signOutFirebase,
  translateFirebaseAuthError,
} from '../services/firebaseAuth';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleCompleteProfileModal, {
  GooglePendingProfile,
} from '../components/auth/GoogleCompleteProfileModal';
import { extractApiErrorMessage, getApiErrorCode } from '../utils/errorHandler';
import { formatCpfInput, formatPhoneInput, onlyDigits } from '../utils/formatters';

const schema = yup
  .object({
    name: yup.string().trim().min(2, 'Informe seu nome completo').required('Campo obrigatório'),
    email: yup.string().email('E-mail inválido').required('Campo obrigatório'),
    cpf: yup
      .string()
      .required('CPF obrigatório')
      .test('cpf-len', 'CPF deve conter 11 dígitos', (v) => onlyDigits(v).length === 11),
    phone: yup
      .string()
      .required('Telefone obrigatório')
      .test('phone-len', 'Informe DDD + número', (v) => onlyDigits(v).length >= 10),
    password: yup.string().min(6, 'Mínimo 6 caracteres').required('Campo obrigatório'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'As senhas não conferem')
      .required('Campo obrigatório'),
  })
  .required();

type FormData = yup.InferType<typeof schema>;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePending, setGooglePending] = useState<GooglePendingProfile | null>(null);
  const [cpfRedirectBanner, setCpfRedirectBanner] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: { cpf: '', phone: '' },
  });

  const cpfValue = watch('cpf') || '';
  const phoneValue = watch('phone') || '';

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
        const { access_token, user } = response.data;
        login(access_token, user);
        toast.success('Você já possui conta! Acesso liberado.');
        navigate('/dashboard');
      } catch (error: unknown) {
        await signOutFirebase();
        toast.error(extractApiErrorMessage(error, 'Erro ao continuar com Google'));
      } finally {
        if (active) setGoogleLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [login, navigate]);

  const onSubmit = async (data: FormData) => {
    setCpfRedirectBanner(null);
    const cpfDigits = onlyDigits(data.cpf);

    try {
      setLoading(true);
      const fbResult = await registerWithEmailFirebase(
        data.email.trim(),
        data.password,
        data.name.trim(),
      );

      const response = await api.post('/auth/firebase-register', {
        idToken: fbResult.idToken,
        name: data.name.trim(),
        cpf: cpfDigits,
        phone: onlyDigits(data.phone),
      });

      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Conta criada com sucesso! Bem-vindo ao Painel Monet.');
      navigate('/dashboard');
    } catch (error: unknown) {
      const code = getApiErrorCode(error);
      const message = extractApiErrorMessage(error, 'Erro ao cadastrar usuário');

      if (code === 'CPF_ALREADY_EXISTS' || message.toLowerCase().includes('cpf já está')) {
        await signOutFirebase();
        setCpfRedirectBanner(
          'Este CPF já está cadastrado em outra conta. Redirecionando para recuperação de senha...',
        );
        toast.warning('Este CPF já existe! Redirecionando para recuperar a senha...');
        setTimeout(() => {
          navigate('/forgot-password', {
            state: {
              identifier: formatCpfInput(cpfDigits),
              reason: 'cpf_exists',
            },
          });
        }, 1800);
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, 'Erro ao cadastrar usuário');
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      const googleResult = await signInWithGooglePopup();
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

      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Você já possui conta! Acesso liberado.');
      navigate('/dashboard');
    } catch (error: unknown) {
      const apiCode = getApiErrorCode(error);
      if (apiCode === 'ACCOUNT_DEACTIVATED') {
        await signOutFirebase();
        toast.warning(
          'Esta conta está desativada. Redirecionando para reativação por e-mail...',
        );
        navigate('/forgot-password', { state: { reason: 'reactivate' } });
        return;
      }

      const firebaseMsg = translateFirebaseAuthError(error, 'Erro ao continuar com Google');
      if (firebaseMsg === '') return;
      if (firebaseMsg) {
        toast.error(firebaseMsg);
        return;
      }

      await signOutFirebase();
      toast.error(extractApiErrorMessage(error, 'Erro ao continuar com Google'));
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
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center">
            {React.createElement(FaLandmark as any, { className: 'text-base' })}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">Controle Financeiro</p>
            <p className="text-[11px] text-slate-400">Executive Wealth Suite</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-white">
            Comece hoje uma rotina financeira organizada e previsível.
          </h1>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              {React.createElement(FaCheckCircle as any, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>Controle completo de salários, adiantamento quinzenal e receitas extras</span>
            </div>
            <div className="flex items-center gap-2.5">
              {React.createElement(FaCheckCircle as any, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>Modo Família seguro validado por CPF único + ID em tempo real</span>
            </div>
            <div className="flex items-center gap-2.5">
              {React.createElement(FaShieldAlt as any, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>Autenticação protegida pelo Firebase com recuperação gratuita por e-mail</span>
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
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Criar conta</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Cadastre-se com Gmail ou preencha seus dados abaixo.
            </p>
          </div>

          <div className="exec-card p-6 sm:p-8">
            <GoogleSignInButton
              onClick={handleGoogleRegister}
              loading={googleLoading}
              label="Cadastrar com Google (Gmail)"
            />

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-medium">
                  ou preencha manualmente
                </span>
              </div>
            </div>

            {cpfRedirectBanner && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                {React.createElement(FaExclamationTriangle as any, {
                  className: 'text-amber-600 text-sm mt-0.5 flex-shrink-0',
                })}
                <div>
                  <p className="font-semibold">{cpfRedirectBanner}</p>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/forgot-password', {
                        state: { identifier: cpfValue, reason: 'cpf_exists' },
                      })
                    }
                    className="mt-1 underline font-semibold text-amber-950"
                  >
                    Ir agora para recuperação de senha
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="name" className="exec-label">
                  Nome completo *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
                  placeholder="Seu nome"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="exec-label">
                  E-mail *
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
                  placeholder="nome@empresa.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cpf" className="exec-label">
                    CPF * (chave única)
                  </label>
                  <input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    value={cpfValue}
                    onChange={(e) => setValue('cpf', formatCpfInput(e.target.value))}
                    className={`exec-input tabular-nums ${errors.cpf ? 'exec-input-error' : ''}`}
                    placeholder="000.000.000-00"
                  />
                  {errors.cpf && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.cpf.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="exec-label">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phoneValue}
                    onChange={(e) => setValue('phone', formatPhoneInput(e.target.value))}
                    className={`exec-input tabular-nums ${errors.phone ? 'exec-input-error' : ''}`}
                    placeholder="(11) 99999-9999"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="exec-label">
                    Senha *
                  </label>
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    className={`exec-input ${errors.password ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="exec-label">
                    Confirmar senha *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    className={`exec-input ${errors.confirmPassword ? 'exec-input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="exec-btn-primary w-full py-3 mt-2"
              >
                {loading ? 'Criando conta...' : 'Finalizar cadastro'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Já possui acesso?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-slate-900 hover:underline underline-offset-4"
                >
                  Fazer login
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

export default Register;
