import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import api from '../api';
import { extractApiErrorMessage } from '../utils/errorHandler';
import {
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaWhatsapp,
  FaShieldAlt,
  FaDownload,
  FaExclamationTriangle,
} from 'react-icons/fa';
import AccountDangerModal from './AccountDangerModal';
import {
  buildWhatsAppUrl,
  formatCpfInput,
  formatPhoneInput,
  onlyDigits,
} from '../utils/formatters';

const schema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  cpf: yup
    .string()
    .optional()
    .test('cpf-len', 'CPF deve conter 11 dígitos', (v) => {
      const d = onlyDigits(v);
      return d.length === 0 || d.length === 11;
    }),
  phone: yup.string().optional(),
  password: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .min(6, 'Mínimo 6 caracteres')
    .optional(),
  confirmPassword: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .oneOf([yup.ref('password'), undefined], 'As senhas não conferem')
    .optional(),
});

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: { name: string; email: string; cpf?: string | null; phone?: string | null };
  onSuccess: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  userData,
  onSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      name: userData.name,
      email: userData.email,
      cpf: formatCpfInput(userData.cpf),
      phone: formatPhoneInput(userData.phone),
      password: '',
      confirmPassword: '',
    },
  });

  const cpfValue = watch('cpf') || '';
  const phoneValue = watch('phone') || '';
  const whatsappLink = buildWhatsAppUrl(phoneValue);

  useEffect(() => {
    if (isOpen) {
      reset({
        name: userData.name,
        email: userData.email,
        cpf: formatCpfInput(userData.cpf),
        phone: formatPhoneInput(userData.phone),
        password: '',
        confirmPassword: '',
      });
    }
  }, [isOpen, userData, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const payload: Record<string, any> = {
        name: data.name,
        email: data.email,
        cpf: onlyDigits(data.cpf),
        phone: onlyDigits(data.phone),
      };
      if (data.password) payload.password = data.password;

      await api.patch('/users/me', payload);
      toast.success('Perfil atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao atualizar perfil'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      const response = await api.get('/users/me/export');
      const formattedJson = JSON.stringify(response.data, null, 2);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `painel-monet-backup-${dateStamp}.json`;

      const rnWebView = (
        window as unknown as {
          ReactNativeWebView?: { postMessage: (msg: string) => void };
        }
      ).ReactNativeWebView;

      if (rnWebView && typeof rnWebView.postMessage === 'function') {
        rnWebView.postMessage(
          JSON.stringify({
            type: 'DOWNLOAD_BACKUP',
            filename,
            content: formattedJson,
          }),
        );
        toast.success('Backup enviado para compartilhamento no aplicativo!');
        return;
      }

      const jsonBlob = new Blob([formattedJson], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Backup dos seus dados baixado com sucesso!');
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao exportar dados'));
    } finally {
      setDownloadingBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-executive-lg overflow-hidden border border-slate-200 my-8">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              {React.createElement(FaUser as any, { className: 'text-sm' })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Perfil do Usuário</h3>
              <p className="text-xs text-slate-500">
                Dados cadastrais, CPF (Modo Família) e contato WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as any, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="exec-label">Nome completo</label>
            <input
              {...register('name')}
              className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div>
            <label className="exec-label">E-mail de acesso</label>
            <input
              type="email"
              {...register('email')}
              className={`exec-input ${errors.email ? 'exec-input-error' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="exec-label">CPF (Chave Modo Família)</label>
              <input
                type="text"
                inputMode="numeric"
                value={cpfValue}
                onChange={(e) => setValue('cpf', formatCpfInput(e.target.value))}
                className={`exec-input tabular-nums ${errors.cpf ? 'exec-input-error' : ''}`}
                placeholder="000.000.000-00"
              />
              {errors.cpf && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.cpf.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="exec-label">Telefone / WhatsApp</label>
              <input
                type="tel"
                inputMode="tel"
                value={phoneValue}
                onChange={(e) => setValue('phone', formatPhoneInput(e.target.value))}
                className="exec-input tabular-nums"
                placeholder="(11) 99999-9999"
              />
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  {React.createElement(FaWhatsapp as any, { className: 'text-sm' })}
                  Abrir link do WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 flex items-start gap-2.5">
            {React.createElement(FaShieldAlt as any, {
              className: 'text-slate-600 text-xs mt-0.5 flex-shrink-0',
            })}
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Seu <strong>CPF</strong> é utilizado em conjunto com o seu <strong>ID</strong> como
              chave de segurança para localizar e autenticar vínculos no <strong>Modo Família</strong>.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="exec-label">Nova senha (opcional)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`exec-input pr-10 ${errors.password ? 'exec-input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {React.createElement((showPassword ? FaEyeSlash : FaEye) as any, {
                    className: 'text-sm',
                  })}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.password.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="exec-label">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className={`exec-input pr-10 ${errors.confirmPassword ? 'exec-input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {React.createElement((showConfirmPassword ? FaEyeSlash : FaEye) as any, {
                    className: 'text-sm',
                  })}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.confirmPassword.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              {React.createElement(FaDownload as any, { className: 'text-xs' })}
              {downloadingBackup ? 'Gerando backup...' : 'Baixar meus dados (.json)'}
            </button>

            <button
              type="button"
              onClick={() => setDangerModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
            >
              {React.createElement(FaExclamationTriangle as any, { className: 'text-xs' })}
              Desativar / Excluir conta
            </button>
          </div>
        </form>
      </div>

      <AccountDangerModal
        isOpen={dangerModalOpen}
        onClose={() => setDangerModalOpen(false)}
        onDownloadBackup={handleDownloadBackup}
        downloading={downloadingBackup}
      />
    </div>
  );
};

export default UserEditModal;
