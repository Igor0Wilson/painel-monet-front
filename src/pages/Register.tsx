import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import { FaLandmark, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import { extractApiErrorMessage } from '../utils/errorHandler';
import { formatCpfInput, formatPhoneInput, onlyDigits } from '../utils/formatters';

const schema = yup
  .object({
    name: yup.string().required('Campo obrigatório'),
    email: yup.string().email('E-mail inválido').required('Campo obrigatório'),
    cpf: yup
      .string()
      .optional()
      .test('cpf-len', 'CPF deve conter 11 dígitos', (v) => {
        const d = onlyDigits(v);
        return d.length === 0 || d.length === 11;
      }),
    phone: yup.string().optional(),
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

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await api.post('/users', {
        name: data.name,
        email: data.email,
        password: data.password,
        cpf: onlyDigits(data.cpf) || undefined,
        phone: onlyDigits(data.phone) || undefined,
      });
      toast.success('Conta criada com sucesso! Faça login para começar.');
      navigate('/login');
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao cadastrar usuário'));
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
              <span>Modo Família seguro validado por CPF + ID com atualização em tempo real</span>
            </div>
            <div className="flex items-center gap-2.5">
              {React.createElement(FaShieldAlt as any, {
                className: 'text-emerald-400 text-sm flex-shrink-0',
              })}
              <span>Reserva de emergência e investimentos protegidos do saldo disponível</span>
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
              Preencha seus dados para configurar seu painel financeiro pessoal ou familiar.
            </p>
          </div>

          <div className="exec-card p-6 sm:p-8">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="name" className="exec-label">
                  Nome completo
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
                  E-mail
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
                    CPF (para Modo Família)
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
                    WhatsApp / Telefone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phoneValue}
                    onChange={(e) => setValue('phone', formatPhoneInput(e.target.value))}
                    className="exec-input tabular-nums"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="exec-label">
                    Senha
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
                    Confirmar senha
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

              <button type="submit" disabled={loading} className="exec-btn-primary w-full py-3 mt-2">
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
    </div>
  );
};

export default Register;
