import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  FaTimes,
  FaReceipt,
  FaShoppingBag,
  FaQrcode,
  FaUniversity,
  FaMoneyBillWave,
  FaCreditCard,
  FaCalendarAlt,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import CustomSelect from './CustomSelect';
import type { PaymentMethod } from './PayExpenseModal';
import { filterOfficialAccountTypes } from '../utils/categories';
import { extractApiErrorMessage } from '../utils/errorHandler';

interface AccountType {
  id: string;
  name: string;
}

const schema = yup
  .object({
    name: yup.string().required('Descrição é obrigatória'),
    accountTypeId: yup.string().required('Selecione uma categoria'),
    value: yup
      .number()
      .typeError('Informe um valor numérico')
      .positive('O valor deve ser positivo')
      .required('Valor é obrigatório'),
    dueDate: yup.string().required('Data é obrigatória'),
    isRecurring: yup.boolean(),
    isInstallment: yup.boolean(),
    installmentCount: yup.number().when('isInstallment', {
      is: true,
      then: (s) => s.min(2, 'Mínimo de 2 parcelas').required('Informe o número de parcelas'),
      otherwise: (s) => s.nullable().transform((v) => v || null),
    }),
    isPaid: yup.boolean(),
  })
  .required();

type FormData = yup.InferType<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getNextMonthIso(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const QUICK_INSTALLMENTS = [1, 2, 3, 6, 10, 12];

const ExpenseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(false);

  // Modo: Conta/Despesa normal vs Compra Pontual
  const [isOneTimePurchase, setIsOneTimePurchase] = useState(false);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<PaymentMethod>('pix');
  const [creditInstallments, setCreditInstallments] = useState<string>('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(getNextMonthIso());
  const [creditError, setCreditError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
    },
  });

  const isRecurring = watch('isRecurring');
  const isInstallment = watch('isInstallment');
  const isPaid = watch('isPaid');
  const watchedValue = Number(watch('value')) || 0;
  const watchedInstallments = Number(watch('installmentCount')) || 0;

  useEffect(() => {
    if (isOpen) {
      api
        .get('/account-types')
        .then((response) => {
          setAccountTypes(filterOfficialAccountTypes(response.data || []));
        })
        .catch((error: unknown) => {
          toast.error(extractApiErrorMessage(error, 'Erro ao carregar categorias'));
        });

      setCreditError('');
      setPurchasePaymentMethod('pix');
      setCreditInstallments('1');
      setFirstInstallmentDate(getNextMonthIso());

      if (initialData) {
        setIsOneTimePurchase(false);
        reset({
          name: initialData.name,
          accountTypeId: initialData.accountTypeId,
          value: initialData.value,
          dueDate: initialData.dueDate,
          isRecurring: initialData.isRecurring,
          isInstallment: initialData.isInstallment,
          installmentCount: initialData.installmentCount,
          isPaid: initialData.isPaid,
        });
      } else {
        setIsOneTimePurchase(false);
        reset({
          name: '',
          value: undefined as any,
          dueDate: getTodayIso(),
          isRecurring: false,
          isInstallment: false,
          isPaid: false,
          accountTypeId: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDateBr = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const onSubmit = async (data: any) => {
    setCreditError('');

    if (!initialData && isOneTimePurchase) {
      if (purchasePaymentMethod === 'credito') {
        const parsedCount = parseInt(creditInstallments, 10);
        if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 60) {
          setCreditError('Informe um número de parcelas entre 1 e 60.');
          return;
        }
        if (!firstInstallmentDate) {
          setCreditError('Informe a data de vencimento da primeira parcela.');
          return;
        }
      }
    }

    try {
      setLoading(true);

      if (initialData) {
        const payload = { ...data };
        if (!payload.isInstallment) delete payload.installmentCount;
        if (payload.isRecurring) payload.isPaid = false;

        await api.patch(`/expenses/${initialData.id}`, payload);
        toast.success('Despesa atualizada com sucesso!');
      } else if (isOneTimePurchase) {
        if (purchasePaymentMethod === 'credito') {
          const parsedCount = parseInt(creditInstallments, 10);
          await api.post('/expenses', {
            name: data.name,
            accountTypeId: data.accountTypeId,
            value: Number(data.value),
            dueDate: firstInstallmentDate,
            isRecurring: false,
            isInstallment: parsedCount >= 2,
            installmentCount: parsedCount,
            isCreditCard: true,
            paymentMethod: 'credito',
            firstInstallmentDate,
          });
          toast.success(
            parsedCount > 1
              ? `Compra no crédito lançada em ${parsedCount}x na fatura do cartão!`
              : 'Compra no crédito (1x) adicionada à fatura do cartão!',
          );
        } else {
          await api.post('/expenses', {
            name: data.name,
            accountTypeId: data.accountTypeId,
            value: Number(data.value),
            dueDate: data.dueDate,
            isRecurring: false,
            isInstallment: false,
            isPaid: true,
            paymentMethod: purchasePaymentMethod,
          });
          toast.success('Compra pontual registrada e debitada do saldo!');
        }
      } else {
        const payload = { ...data };
        if (!payload.isInstallment) {
          delete payload.installmentCount;
        } else {
          payload.isCreditCard = true;
        }
        if (payload.isRecurring) {
          payload.isPaid = false;
        }

        await api.post('/expenses', payload);
        toast.success('Despesa cadastrada com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao processar despesa'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const parsedCreditCount = parseInt(creditInstallments, 10);
  const validCreditCount =
    !isNaN(parsedCreditCount) && parsedCreditCount >= 1 ? parsedCreditCount : 1;

  const installmentPreview =
    !isOneTimePurchase && isInstallment && watchedValue > 0 && watchedInstallments >= 2
      ? formatCurrency(watchedValue / watchedInstallments)
      : null;

  const paymentMethods: {
    id: PaymentMethod;
    label: string;
    subtitle: string;
    icon: any;
  }[] = [
    { id: 'pix', label: 'Pix', subtitle: 'Débito imediato', icon: FaQrcode },
    { id: 'debito', label: 'Débito', subtitle: 'Saldo em conta', icon: FaUniversity },
    { id: 'dinheiro', label: 'Dinheiro', subtitle: 'Em espécie', icon: FaMoneyBillWave },
    { id: 'credito', label: 'Crédito', subtitle: 'Vai para a fatura', icon: FaCreditCard },
  ];

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-xl">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center justify-center">
              {React.createElement((isOneTimePurchase ? FaShoppingBag : FaReceipt) as any, {
                className: 'text-base',
              })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {initialData
                  ? 'Editar Despesa'
                  : isOneTimePurchase
                    ? 'Registrar Compra Pontual'
                    : 'Nova Despesa'}
              </h3>
              <p className="text-xs text-slate-500">
                {isOneTimePurchase
                  ? 'Informe a forma de pagamento (Pix, Débito, Dinheiro ou Cartão de Crédito)'
                  : 'Registre contas fixas, boletos ou compras pontuais'}
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Seletor: Conta/Despesa vs Compra Pontual */}
          {!initialData && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Tipo de lançamento</p>
                <p className="text-[11px] text-slate-500">
                  Escolha <strong>Compra Pontual</strong> para compras feitas na hora (ex.: fast food, eletrônicos).
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 self-start sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOneTimePurchase(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    !isOneTimePurchase
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Conta / Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setIsOneTimePurchase(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isOneTimePurchase
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compra Pontual
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="exec-label">
                {isOneTimePurchase ? 'O que foi comprado?' : 'Descrição da despesa'}
              </label>
              <input
                type="text"
                {...register('name')}
                className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
                placeholder={
                  isOneTimePurchase
                    ? 'Ex: Burger King, Fone Bluetooth, Mercado'
                    : 'Ex: Aluguel, Energia, Internet'
                }
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
              )}
            </div>

            <Controller
              name="accountTypeId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Categoria"
                  options={accountTypes}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.accountTypeId?.message}
                />
              )}
            />

            <div>
              <label className="exec-label">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                {...register('value')}
                className={`exec-input tabular-nums font-semibold ${
                  errors.value ? 'exec-input-error' : ''
                }`}
                placeholder="0,00"
              />
              {errors.value && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.value.message}</p>
              )}
            </div>

            {(!isOneTimePurchase || purchasePaymentMethod !== 'credito') && (
              <div className={isOneTimePurchase ? 'md:col-span-2' : ''}>
                <label className="exec-label">
                  {isOneTimePurchase ? 'Data da compra' : 'Data de vencimento'}
                </label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className={`exec-input ${errors.dueDate ? 'exec-input-error' : ''}`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.dueDate.message}</p>
                )}
              </div>
            )}

            {/* Opções de Conta/Despesa normal */}
            {!isOneTimePurchase && (
              <div className="flex flex-col justify-center gap-3 pt-1">
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" {...register('isRecurring')} className="sr-only" />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        isRecurring ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        isRecurring ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700">Despesa fixa mensal</span>
                </label>

                {!isRecurring && (
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" {...register('isPaid')} className="sr-only" />
                      <div
                        className={`w-10 h-5 rounded-full transition-colors ${
                          isPaid ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          isPaid ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Já liquidada (paga)</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Fluxo de Forma de Pagamento para Compra Pontual */}
          {!initialData && isOneTimePurchase && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label className="exec-label">Como você pagou esta compra?</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {paymentMethods.map((m) => {
                    const isSelected = purchasePaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPurchasePaymentMethod(m.id);
                          setCreditError('');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {React.createElement(m.icon as any, { className: 'text-xs' })}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{m.label}</p>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              isSelected ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {m.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {purchasePaymentMethod === 'credito' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {React.createElement(FaCreditCard as any, {
                      className: 'text-xs text-slate-700',
                    })}
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Detalhes da Fatura / Parcelamento
                    </h4>
                  </div>

                  <div>
                    <label className="exec-label">Em quantas vezes foi?</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_INSTALLMENTS.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setCreditInstallments(String(qty))}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            parsedCreditCount === qty
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {qty}x
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={creditInstallments}
                      onChange={(e) => setCreditInstallments(e.target.value)}
                      className="exec-input tabular-nums font-semibold"
                      placeholder="Ex: 3"
                    />
                  </div>

                  <div>
                    <label className="exec-label flex items-center gap-1.5">
                      {React.createElement(FaCalendarAlt as any, {
                        className: 'text-[10px] text-slate-400',
                      })}
                      Data de vencimento da 1ª parcela (fatura)
                    </label>
                    <input
                      type="date"
                      value={firstInstallmentDate}
                      onChange={(e) => setFirstInstallmentDate(e.target.value)}
                      className="exec-input"
                    />
                  </div>

                  {watchedValue > 0 && (
                    <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-900">
                        Lançamento na Fatura:{' '}
                        <span className="tabular-nums text-emerald-700">
                          {validCreditCount}x de {formatCurrency(watchedValue / validCreditCount)}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        1º vencimento em <strong>{formatDateBr(firstInstallmentDate)}</strong>. Será
                        agrupado automaticamente na <strong>Fatura do Cartão de Crédito</strong> do
                        respectivo mês.
                      </p>
                    </div>
                  )}

                  {creditError && (
                    <p className="text-xs text-rose-600 font-medium">{creditError}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-4 py-3">
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    A compra será registrada como <strong>paga ({purchasePaymentMethod})</strong> e
                    debitada imediatamente do seu <strong>Patrimônio Disponível</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Parcelamento no modo Conta/Despesa normal */}
          {!isOneTimePurchase && !isRecurring && !initialData && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" {...register('isInstallment')} className="sr-only" />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors ${
                      isInstallment ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      isInstallment ? 'translate-x-5' : ''
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700">
                  Despesa parcelada no cartão (gera parcelas mensais automaticamente)
                </span>
              </label>

              {isInstallment && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="exec-label">Quantidade de parcelas</label>
                      <input
                        type="number"
                        min={2}
                        {...register('installmentCount')}
                        className={`exec-input tabular-nums ${
                          errors.installmentCount ? 'exec-input-error' : ''
                        }`}
                        placeholder="Ex: 6"
                      />
                    </div>
                    {installmentPreview && (
                      <div className="sm:pt-5 text-xs text-slate-600">
                        <span className="block text-[11px] text-slate-400">Valor por parcela</span>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {watchedInstallments}x de {installmentPreview}
                        </span>
                      </div>
                    )}
                  </div>
                  {errors.installmentCount && (
                    <p className="text-xs text-rose-600 font-medium">
                      {errors.installmentCount.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? 'Processando...'
                : initialData
                  ? 'Salvar alterações'
                  : isOneTimePurchase
                    ? purchasePaymentMethod === 'credito'
                      ? `Lançar no Crédito (${validCreditCount}x)`
                      : 'Registrar compra paga'
                    : 'Confirmar despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
