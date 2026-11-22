import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
  FaCamera,
  FaImage,
  FaTimes,
  FaTrashAlt,
  FaReceipt,
  FaShoppingBag,
  FaQrcode,
  FaUniversity,
  FaMoneyBillWave,
  FaCreditCard,
  FaCalendarAlt,
  FaUtensils,
  FaHamburger,
} from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';
import CustomSelect from './CustomSelect';
import type { PaymentMethod } from './PayExpenseModal';
import type { ExpenseItem } from '../types/finance';
import {
  filterOfficialAccountTypes,
  isFoodCategory,
  normalizeCategoryName,
} from '../utils/categories';
import { extractApiErrorMessage } from '../utils/errorHandler';
import {
  formatCurrency,
  formatCurrencyInput,
  formatDateBr,
  formatNumberToCurrencyInput,
  parseCurrencyInput,
} from '../utils/formatters';
import { createPreviewDataUrl, prepareImageForUpload } from '../utils/imageUpload';

interface AccountType {
  id: string;
  name: string;
}

interface ExpenseFormData {
  name: string;
  accountTypeId: string;
  value: string;
  dueDate: string;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentCount?: number | null;
  isPaid?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ExpenseItem> | null;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'dinheiro',
  'pix',
  'debito',
  'credito',
  'va',
  'vr',
];

function normalizeDateInput(raw?: string | null): string {
  if (!raw) return getTodayIso();
  return String(raw).split('T')[0];
}

function resolveInitialPaymentMethod(initialData?: Partial<ExpenseItem> | null): PaymentMethod {
  const method = initialData?.paymentMethod as PaymentMethod | undefined;
  if (method && VALID_PAYMENT_METHODS.includes(method)) {
    return method;
  }
  if (initialData?.isCreditCard) {
    return 'credito';
  }
  return 'pix';
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
  const { t } = useTranslation();
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(false);

  // Modo: Conta/Despesa normal vs Compra Pontual
  const [isOneTimePurchase, setIsOneTimePurchase] = useState(false);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<PaymentMethod>('pix');
  const [creditInstallments, setCreditInstallments] = useState<string>('1');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(getNextMonthIso());
  const [creditError, setCreditError] = useState<string>('');
  const [editIsCreditCard, setEditIsCreditCard] = useState<boolean>(false);

  // Foto de comprovante / produto no Cloudinary
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(t('auth.validation.required')),
          accountTypeId: yup.string().required(t('auth.validation.required')),
          value: yup
            .string()
            .required(t('auth.validation.required'))
            .test(
              'positive-currency',
              t('modals.expense.validationError'),
              (val) => parseCurrencyInput(val) > 0,
            ),
          dueDate: yup.string().required(t('auth.validation.required')),
          isRecurring: yup.boolean(),
          isInstallment: yup.boolean(),
          installmentCount: yup.number().when('isInstallment', {
            is: true,
            then: (s) =>
              s
                .transform((v, orig) =>
                  orig === '' || orig === null || Number.isNaN(v) ? undefined : v,
                )
                .min(2, 'Mínimo de 2 parcelas')
                .required(t('auth.validation.required')),
            otherwise: (s) =>
              s
                .nullable()
                .transform((v, orig) => (orig === '' || Number.isNaN(v) ? null : v)),
          }),
          isPaid: yup.boolean(),
        })
        .required(),
    [t],
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: yupResolver(schema) as unknown as Resolver<ExpenseFormData>,
    defaultValues: {
      value: '',
      isRecurring: false,
      isInstallment: false,
      isPaid: false,
    },
  });

  const isRecurring = watch('isRecurring');
  const isInstallment = watch('isInstallment');
  const isPaid = watch('isPaid');
  const watchedValue = parseCurrencyInput(watch('value'));
  const watchedInstallments = Number(watch('installmentCount')) || 0;
  const watchedAccountTypeId = watch('accountTypeId');
  const watchedName = watch('name');

  const selectedCategoryName =
    accountTypes.find((t) => t.id === watchedAccountTypeId)?.name ||
    initialData?.accountType?.name ||
    '';
  const showFoodVoucherOptions = isFoodCategory(selectedCategoryName, watchedName);

  useEffect(() => {
    if (
      !showFoodVoucherOptions &&
      (purchasePaymentMethod === 'va' || purchasePaymentMethod === 'vr')
    ) {
      setPurchasePaymentMethod('pix');
    }
  }, [showFoodVoucherOptions, purchasePaymentMethod]);

  const isMarkingPaidOnEdit = Boolean(initialData && !initialData.isPaid && !isRecurring && isPaid);
  const showPaymentFlow =
    (!initialData && (isOneTimePurchase || (!isRecurring && Boolean(isPaid)))) ||
    isMarkingPaidOnEdit;

  useEffect(() => {
    if (isOpen) {
      let active = true;
      api
        .get('/account-types')
        .then((response) => {
          if (!active) return;
          const officialTypes = filterOfficialAccountTypes(response.data || []);
          setAccountTypes(officialTypes);

          if (initialData) {
            const exactMatch = officialTypes.find((t) => t.id === initialData.accountTypeId);
            if (exactMatch) {
              setValue('accountTypeId', exactMatch.id);
            } else if (initialData.accountType?.name) {
              const targetCategory = normalizeCategoryName(initialData.accountType.name);
              const categoryMatch = officialTypes.find(
                (t) => normalizeCategoryName(t.name) === targetCategory,
              );
              if (categoryMatch) {
                setValue('accountTypeId', categoryMatch.id);
              }
            }
          }
        })
        .catch((error: unknown) => {
          toast.error(extractApiErrorMessage(error, 'Erro ao carregar categorias'));
        });

      setCreditError('');

      if (initialData) {
        const normalizedDue = normalizeDateInput(initialData.dueDate);
        const initialCredit = Boolean(
          initialData.isCreditCard || initialData.paymentMethod === 'credito',
        );
        const initialMethod = resolveInitialPaymentMethod(initialData);
        const initialInstallmentQty =
          initialData.installmentCount && initialData.installmentCount >= 1
            ? initialData.installmentCount
            : 1;

        setIsOneTimePurchase(false);
        setEditIsCreditCard(initialCredit);
        setPurchasePaymentMethod(initialMethod);
        setCreditInstallments(String(initialInstallmentQty));
        setFirstInstallmentDate(normalizedDue || getNextMonthIso());
        setReceiptFile(null);
        setReceiptPreview(initialData.receiptUrl || null);
        setRemoveExistingReceipt(false);
        reset({
          name: initialData.name || '',
          accountTypeId: initialData.accountTypeId || initialData.accountType?.id || '',
          value: formatNumberToCurrencyInput(initialData.value),
          dueDate: normalizedDue,
          isRecurring: Boolean(initialData.isRecurring),
          isInstallment: Boolean(initialData.isInstallment),
          installmentCount: initialData.installmentCount ?? undefined,
          isPaid: Boolean(initialData.isPaid),
        });
      } else {
        setIsOneTimePurchase(false);
        setEditIsCreditCard(false);
        setPurchasePaymentMethod('pix');
        setCreditInstallments('1');
        setFirstInstallmentDate(getNextMonthIso());
        setReceiptFile(null);
        setReceiptPreview(null);
        setRemoveExistingReceipt(false);
        reset({
          name: '',
          value: '',
          dueDate: getTodayIso(),
          isRecurring: false,
          isInstallment: false,
          installmentCount: undefined,
          isPaid: false,
          accountTypeId: '',
        });
      }

      return () => {
        active = false;
      };
    }
    return undefined;
  }, [isOpen, initialData, reset, setValue]);

  const handleSelectReceiptPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;

    const { file, error } = await prepareImageForUpload(selected);
    if (error === 'invalid_type') {
      toast.error(t('common.photoInvalidType'));
      return;
    }
    if (error === 'too_large') {
      toast.error(t('common.photoTooLarge'));
      return;
    }

    try {
      const preview = await createPreviewDataUrl(file);
      setReceiptFile(file);
      setReceiptPreview(preview);
      setRemoveExistingReceipt(false);
    } catch {
      toast.error(t('common.photoInvalidType'));
    }
  };

  const handleClearReceiptPhoto = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (initialData?.receiptUrl) {
      setRemoveExistingReceipt(true);
    }
  };

  const syncReceiptPhoto = async (targetExpenseId?: string | null) => {
    if (!targetExpenseId) return;
    if (receiptFile) {
      const formData = new FormData();
      formData.append('file', receiptFile);
      await api.post(`/expenses/${targetExpenseId}/photo`, formData);
    } else if (removeExistingReceipt && initialData?.receiptUrl) {
      await api.delete(`/expenses/${targetExpenseId}/photo`);
    }
  };

  const extractCreatedId = (responseData: unknown): string | null => {
    if (Array.isArray(responseData) && responseData.length > 0) {
      const first = responseData[0] as { id?: string };
      return first?.id || null;
    }
    if (responseData && typeof responseData === 'object') {
      return (responseData as { id?: string }).id || null;
    }
    return null;
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setCreditError('');

    if (showPaymentFlow) {
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
      const parsedValue = Number(parseCurrencyInput(data.value).toFixed(2));
      let savedExpenseId: string | null = initialData?.id || null;

      if (initialData) {
        const payload: Record<string, unknown> = {
          name: data.name.trim(),
          accountTypeId: data.accountTypeId,
          value: parsedValue,
          dueDate: data.dueDate,
          isRecurring: Boolean(data.isRecurring),
          isInstallment: Boolean(data.isInstallment),
          isPaid: Boolean(data.isPaid),
          isCreditCard: editIsCreditCard,
        };
        if (data.isInstallment && data.installmentCount) {
          payload.installmentCount = Number(data.installmentCount);
        }
        if (payload.isRecurring) {
          payload.isPaid = false;
        }
        if (data.isPaid && !isMarkingPaidOnEdit) {
          payload.paymentMethod = purchasePaymentMethod;
          if (purchasePaymentMethod === 'credito') {
            payload.isCreditCard = true;
          }
        }

        if (isMarkingPaidOnEdit) {
          await api.patch(`/expenses/${initialData.id}`, {
            ...payload,
            isPaid: false,
          });
          const payPayload: {
            paymentMethod: PaymentMethod;
            installments?: number;
            firstInstallmentDate?: string;
          } = { paymentMethod: purchasePaymentMethod };
          if (purchasePaymentMethod === 'credito') {
            payPayload.installments = parseInt(creditInstallments, 10);
            payPayload.firstInstallmentDate = firstInstallmentDate;
          }
          await api.patch(`/expenses/${initialData.id}/pay`, payPayload);
          await syncReceiptPhoto(savedExpenseId);
          toast.success(t('modals.payExpense.paidSingleToast'));
        } else {
          await api.patch(`/expenses/${initialData.id}`, payload);
          await syncReceiptPhoto(savedExpenseId);
          toast.success(t('modals.expense.updatedToast'));
        }
      } else if (showPaymentFlow) {
        if (purchasePaymentMethod === 'credito') {
          const parsedCount = parseInt(creditInstallments, 10);
          const createdRes = await api.post('/expenses', {
            name: data.name,
            accountTypeId: data.accountTypeId,
            value: parsedValue,
            dueDate: firstInstallmentDate,
            isRecurring: false,
            isInstallment: parsedCount >= 2,
            installmentCount: parsedCount,
            isCreditCard: true,
            paymentMethod: 'credito',
            firstInstallmentDate,
          });
          savedExpenseId = extractCreatedId(createdRes.data);
          await syncReceiptPhoto(savedExpenseId);
          toast.success(t('modals.expense.createdToast'));
        } else {
          const createdRes = await api.post('/expenses', {
            name: data.name,
            accountTypeId: data.accountTypeId,
            value: parsedValue,
            dueDate: data.dueDate,
            isRecurring: false,
            isInstallment: false,
            isPaid: true,
            paymentMethod: purchasePaymentMethod,
          });
          savedExpenseId = extractCreatedId(createdRes.data);
          await syncReceiptPhoto(savedExpenseId);
          toast.success(t('modals.payExpense.paidSingleToast'));
        }
      } else {
        const payload: Record<string, unknown> = {
          ...data,
          value: parsedValue,
        };
        if (!payload.isInstallment) {
          delete payload.installmentCount;
        } else {
          payload.isCreditCard = true;
        }
        if (payload.isRecurring) {
          payload.isPaid = false;
        }

        const createdRes = await api.post('/expenses', payload);
        savedExpenseId = extractCreatedId(createdRes.data);
        await syncReceiptPhoto(savedExpenseId);
        toast.success(t('modals.expense.createdToast'));
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('modals.expense.validationError')));
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
    icon: IconType;
  }[] = [
      { id: 'pix', label: t('paymentMethods.pix'), subtitle: 'Pix', icon: FaQrcode },
      { id: 'debito', label: t('paymentMethods.debito'), subtitle: t('paymentMethods.debitoFull'), icon: FaUniversity },
      { id: 'dinheiro', label: t('paymentMethods.dinheiro'), subtitle: t('paymentMethods.dinheiro'), icon: FaMoneyBillWave },
      { id: 'credito', label: t('paymentMethods.credito'), subtitle: t('paymentMethods.creditoFull'), icon: FaCreditCard },
      ...(showFoodVoucherOptions
        ? [
          {
            id: 'va' as PaymentMethod,
            label: t('paymentMethods.vaFull'),
            subtitle: 'VA / VR',
            icon: FaUtensils,
          },
          {
            id: 'vr' as PaymentMethod,
            label: t('paymentMethods.vrFull'),
            subtitle: 'VA / VR',
            icon: FaHamburger,
          },
        ]
        : []),
    ];

  return (
    <div className="exec-modal-overlay z-50">
      <div className="exec-modal-container max-w-xl">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center">
              {React.createElement((isOneTimePurchase ? FaShoppingBag : FaReceipt) as unknown as React.ComponentType<{ className?: string }>, {
                className: 'text-base',
              })}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {initialData
                  ? t('modals.expense.editTitle')
                  : t('modals.expense.newTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modals.expense.photoSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-lg"
          >
            {React.createElement(FaTimes as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Seletor: Conta/Despesa vs Compra Pontual */}
          {!initialData && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('modals.expense.newTitle')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('modals.expense.paymentMethodLabel')}
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 self-start sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOneTimePurchase(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!isOneTimePurchase
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('modals.expense.newTitle')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOneTimePurchase(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${isOneTimePurchase
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('modals.expense.isPaidLabel')}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="exec-label">{t('modals.expense.nameLabel')}</label>
              <input
                type="text"
                {...register('name')}
                className={`exec-input ${errors.name ? 'exec-input-error' : ''}`}
                placeholder={t('modals.expense.namePlaceholder')}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <Controller
              name="accountTypeId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label={t('modals.expense.categoryLabel')}
                  options={accountTypes}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.accountTypeId?.message}
                />
              )}
            />

            <div>
              <label className="exec-label">{t('modals.expense.valueLabel')}</label>
              <Controller
                name="value"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={field.value || ''}
                    onChange={(e) =>
                      field.onChange(formatCurrencyInput(e.target.value, field.value || ''))
                    }
                    className={`exec-input tabular-nums font-semibold ${errors.value ? 'exec-input-error' : ''
                      }`}
                    placeholder="0,00"
                  />
                )}
              />
              {errors.value && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.value.message}
                </p>
              )}
            </div>

            {(!showPaymentFlow || purchasePaymentMethod !== 'credito') && (
              <div className={isOneTimePurchase ? 'md:col-span-2' : ''}>
                <label className="exec-label">{t('modals.expense.dueDateLabel')}</label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className={`exec-input ${errors.dueDate ? 'exec-input-error' : ''}`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {errors.dueDate.message}
                  </p>
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
                      className={`w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isRecurring ? 'translate-x-5' : ''
                        }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('modals.expense.isRecurringLabel')}
                  </span>
                </label>

                {!isRecurring && (
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" {...register('isPaid')} className="sr-only" />
                      <div
                        className={`w-10 h-5 rounded-full transition-colors ${isPaid ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                      />
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-5' : ''
                          }`}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t('modals.expense.isPaidLabel')}
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Fluxo de Forma de Pagamento */}
          {showPaymentFlow && (
            <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div>
                <label className="exec-label">{t('modals.expense.paymentMethodLabel')}</label>
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
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${isSelected
                          ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                          }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/15 text-white dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          {React.createElement(m.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{m.label}</p>
                          <p
                            className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300 dark:text-slate-800' : 'text-slate-400'
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
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {React.createElement(FaCreditCard as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-xs text-slate-700 dark:text-slate-300',
                    })}
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('modals.expense.isInstallmentLabel')}
                    </h4>
                  </div>

                  <div>
                    <label className="exec-label">{t('modals.expense.installmentCountLabel')}</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_INSTALLMENTS.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setCreditInstallments(String(qty))}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${parsedCreditCount === qty
                            ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 border-slate-900 dark:border-emerald-500'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
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
                      {React.createElement(FaCalendarAlt as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-[10px] text-slate-400',
                      })}
                      {t('modals.expense.creditCardFirstDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={firstInstallmentDate}
                      onChange={(e) => setFirstInstallmentDate(e.target.value)}
                      className="exec-input"
                    />
                  </div>

                  {watchedValue > 0 && (
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {t('paymentMethods.creditoFull')}:{' '}
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                          {validCreditCount}x {formatCurrency(watchedValue / validCreditCount)}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDateBr(firstInstallmentDate)}
                      </p>
                    </div>
                  )}

                  {creditError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{creditError}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Edição de Cartão de Crédito, Parcelamento e Forma de Pagamento recuperados */}
          {initialData && !showPaymentFlow && !isRecurring && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {React.createElement(
                      FaCreditCard as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-xs text-slate-700 dark:text-slate-300' },
                    )}
                    <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('paymentMethods.creditoFull')}
                    </span>
                  </div>
                  {initialData.installmentNumber && initialData.installmentCount && (
                    <span className="text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-0.5 rounded-full tabular-nums">
                      {t('expenses.installmentBadge', {
                        current: initialData.installmentNumber,
                        total: initialData.installmentCount,
                      })}
                    </span>
                  )}
                </div>

                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editIsCreditCard}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditIsCreditCard(checked);
                        if (isPaid) {
                          setPurchasePaymentMethod(checked ? 'credito' : 'pix');
                        }
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${editIsCreditCard ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editIsCreditCard ? 'translate-x-5' : ''
                        }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('modals.expense.isCreditCardLabel')}
                  </span>
                </label>

                {isPaid && (
                  <div>
                    <label className="exec-label">{t('modals.expense.paymentMethodLabel')}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {paymentMethods.map((m) => {
                        const isSelected = purchasePaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setPurchasePaymentMethod(m.id);
                              if (m.id === 'credito') {
                                setEditIsCreditCard(true);
                              }
                            }}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 ${isSelected
                              ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                              }`}
                          >
                            {React.createElement(
                              m.icon as unknown as React.ComponentType<{ className?: string }>,
                              { className: 'text-[11px]' },
                            )}
                            <span className="truncate">{m.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" {...register('isInstallment')} className="sr-only" />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${isInstallment ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isInstallment ? 'translate-x-5' : ''
                        }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('modals.expense.isInstallmentLabel')}
                  </span>
                </label>

                {isInstallment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="exec-label">{t('modals.expense.installmentCountLabel')}</label>
                      <input
                        type="number"
                        min={2}
                        {...register('installmentCount')}
                        className={`exec-input tabular-nums ${errors.installmentCount ? 'exec-input-error' : ''
                          }`}
                        placeholder="Ex: 6"
                      />
                      {errors.installmentCount && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          {errors.installmentCount.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parcelamento no modo Conta/Despesa normal */}
          {!showPaymentFlow && !isOneTimePurchase && !isRecurring && !initialData && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" {...register('isInstallment')} className="sr-only" />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors ${isInstallment ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isInstallment ? 'translate-x-5' : ''
                      }`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('modals.expense.isInstallmentLabel')}
                </span>
              </label>

              {isInstallment && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="exec-label">{t('modals.expense.installmentCountLabel')}</label>
                      <input
                        type="number"
                        min={2}
                        {...register('installmentCount')}
                        className={`exec-input tabular-nums ${errors.installmentCount ? 'exec-input-error' : ''
                          }`}
                        placeholder="Ex: 6"
                      />
                    </div>
                    {installmentPreview && (
                      <div className="sm:pt-5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                          {watchedInstallments}x {installmentPreview}
                        </span>
                      </div>
                    )}
                  </div>
                  {errors.installmentCount && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {errors.installmentCount.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Foto / Comprovante no Cloudinary */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <label className="exec-label">{t('modals.expense.photoLabel')}</label>
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-300/70 dark:border-slate-600">
                {receiptPreview ? (
                  <img
                    src={receiptPreview}
                    alt={t('common.photoAltExpense')}
                    className="w-full h-full object-cover"
                    data-testid="expense-photo-preview"
                  />
                ) : (
                  React.createElement(FaImage as unknown as React.ComponentType<{ className?: string }>, {
                    className: 'text-xl',
                  })
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                  {t('modals.expense.photoSubtitle')} • {t('common.photoHint')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleSelectReceiptPhoto}
                    className="hidden"
                    data-testid="expense-photo-input"
                  />
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors"
                  >
                    {React.createElement(FaCamera as unknown as React.ComponentType<{ className?: string }>, {
                      className: 'text-[11px]',
                    })}
                    <span>{receiptPreview ? t('common.changePhoto') : t('common.selectPhoto')}</span>
                  </button>
                  {receiptPreview && (
                    <button
                      type="button"
                      onClick={handleClearReceiptPhoto}
                      data-testid="expense-remove-photo-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors"
                    >
                      {React.createElement(FaTrashAlt as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-[11px]',
                      })}
                      <span>{t('common.removePhoto')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="exec-btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="exec-btn-primary">
              {loading
                ? t('common.processing')
                : initialData
                  ? t('modals.expense.saveEdit')
                  : t('modals.expense.saveNew')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
