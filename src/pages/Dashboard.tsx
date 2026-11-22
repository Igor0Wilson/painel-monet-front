import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { FaBell, FaHistory, FaPlus, FaThLarge, FaUser, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import ConfirmationModal from '../components/ConfirmationModal';
import ExpenseModal from '../components/ExpenseModal';
import FamilyInviteModal, { PendingFamilyInvite } from '../components/FamilyInviteModal';
import FamilyModal from '../components/FamilyModal';
import HistoryTab from '../components/HistoryTab';
import IncomeModal from '../components/IncomeModal';
import PayCreditCardModal, { CreditCardInvoiceGroup } from '../components/PayCreditCardModal';
import PayExpenseModal from '../components/PayExpenseModal';
import UserEditModal from '../components/UserEditModal';
import AllocationModal from '../components/dashboard/AllocationModal';
import CategoryDetailsView from '../components/dashboard/CategoryDetailsView';
import CreditCardInvoicePanel from '../components/dashboard/CreditCardInvoicePanel';
import ExpensesListSection from '../components/dashboard/ExpensesListSection';
import FamilyMembersStrip from '../components/dashboard/FamilyMembersStrip';
import IncomesListSection from '../components/dashboard/IncomesListSection';
import InvestmentsListSection from '../components/dashboard/InvestmentsListSection';
import InvestmentsModal from '../components/dashboard/InvestmentsModal';
import KpiGrid from '../components/dashboard/KpiGrid';
import MonthlyChartsSection from '../components/dashboard/MonthlyChartsSection';
import Navbar from '../components/dashboard/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFamilyRealtimeSync } from '../hooks/useFamilyRealtimeSync';
import {
  ActiveTab,
  BalanceData,
  ChartDataResponse,
  ExpenseFilter,
  ExpenseItem,
  FamilyStatusData,
  IncomeItem,
  InvestmentItem,
  PanelScope,
} from '../types/finance';
import {
  notifyFamilyInviteOnDevice,
  requestDeviceNotificationPermission,
} from '../utils/deviceNotifications';
import { extractApiErrorMessage, getApiErrorStatus } from '../utils/errorHandler';
import {
  formatMonthLabel,
  formatNumberToCurrencyInput,
  getCurrentMonthKey,
  parseCurrencyInput,
} from '../utils/formatters';
import { getActiveLocale } from '../i18n';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
);

const INITIAL_BALANCE: BalanceData = {
  balance: 0,
  totalIncome: 0,
  scheduledIncome: 0,
  totalExpenses: 0,
  emergencyFund: 0,
  allocatedEmergencyFund: 0,
  externalEmergencyFund: 0,
  investments: 0,
  allocatedInvestments: 0,
  externalInvestments: 0,
  foodAllowance: 0,
  foodAllowanceTotal: 0,
  foodAllowanceUsed: 0,
  ownBalance: 0,
  ownEmergencyFund: 0,
  ownAllocatedEmergencyFund: 0,
  ownExternalEmergencyFund: 0,
  ownInvestments: 0,
  ownAllocatedInvestments: 0,
  ownExternalInvestments: 0,
  ownFoodAllowance: 0,
  ownFoodAllowanceTotal: 0,
  ownFoodAllowanceUsed: 0,
  memberBreakdown: [],
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [panelScope, setPanelScope] = useState<PanelScope>('individual');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(getCurrentMonthKey());
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  const [balance, setBalance] = useState<BalanceData>(INITIAL_BALANCE);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('todas');

  const [familyStatus, setFamilyStatus] = useState<FamilyStatusData | null>(null);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [activeInviteModal, setActiveInviteModal] = useState<PendingFamilyInvite | null>(null);
  const dismissedInviteIdsRef = useRef<Set<string>>(new Set());

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    | (Partial<ExpenseItem> & { type: 'expense' })
    | (Partial<IncomeItem> & { type: 'income' })
    | null
  >(null);
  const [payingExpense, setPayingExpense] = useState<ExpenseItem | null>(null);
  const [payingBatchExpenses, setPayingBatchExpenses] = useState<ExpenseItem[]>([]);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState<string>('');
  const [payingInvoice, setPayingInvoice] = useState<CreditCardInvoiceGroup | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{
    id: string;
    type: 'expense' | 'income' | 'investment';
  } | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [undoPayTarget, setUndoPayTarget] = useState<ExpenseItem | null>(null);
  const [isUndoPayLoading, setIsUndoPayLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openInstallments, setOpenInstallments] = useState<string[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isInvestmentsModalOpen, setIsInvestmentsModalOpen] = useState(false);
  const [editingInvestmentItem, setEditingInvestmentItem] = useState<InvestmentItem | null>(null);

  const [allocationModal, setAllocationModal] = useState<'emergency' | 'investment' | 'food' | null>(
    null,
  );
  const [allocationInput, setAllocationInput] = useState('');
  const [foodCreditDate, setFoodCreditDate] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [foodIsRecurring, setFoodIsRecurring] = useState<boolean>(true);
  const [savingsFromBalance, setSavingsFromBalance] = useState<boolean>(false);
  const [isAllocationLoading, setIsAllocationLoading] = useState(false);

  const [categoryDetailState, setCategoryDetailState] = useState<{
    isOpen: boolean;
    month: string;
    initialCategory: string | null;
  }>({
    isOpen: false,
    month: getCurrentMonthKey(),
    initialCategory: null,
  });

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const chartMonth = categoryDetailState.isOpen
    ? categoryDetailState.month
    : activeTab === 'history'
      ? selectedHistoryMonth
      : currentMonthKey;
  const isFamilyMode = panelScope === 'family';

  const fetchFamilyStatus = useCallback(async () => {
    try {
      const res = await api.get<FamilyStatusData>('/family/status');
      const status = res.data;
      setFamilyStatus(status);

      if (!status.inFamily) {
        setPanelScope((prev) => (prev === 'family' ? 'individual' : prev));
      }

      const firstPending = status.pendingReceivedInvites?.[0];
      if (firstPending) {
        notifyFamilyInviteOnDevice(firstPending).catch(() => undefined);
      }
      if (firstPending && !dismissedInviteIdsRef.current.has(firstPending.id)) {
        setActiveInviteModal((curr) => curr || firstPending);
      }
    } catch (error: unknown) {
      if (getApiErrorStatus(error) === 401) {
        logout();
      }
    }
  }, [logout]);

  const fetchData = useCallback(
    async (overrideScope?: PanelScope, overrideMonth?: string) => {
      const scopeToUse = overrideScope || panelScope;
      const monthToUse = overrideMonth || chartMonth;

      try {
        const [balanceRes, expensesRes, incomesRes, investmentsRes, chartsRes] = await Promise.all([
          api.get<BalanceData>('/balance', { params: { scope: scopeToUse } }),
          api.get<ExpenseItem[]>('/expenses', { params: { scope: scopeToUse } }),
          api.get<IncomeItem[]>('/income', { params: { scope: scopeToUse } }),
          api.get<InvestmentItem[]>('/balance/investments/items', {
            params: { scope: scopeToUse },
          }),
          api.get<ChartDataResponse>('/balance/charts', {
            params: { scope: scopeToUse, month: monthToUse },
          }),
        ]);
        setBalance(balanceRes.data);
        setExpenses(expensesRes.data);
        setIncomes(incomesRes.data);
        setInvestmentItems(investmentsRes.data);
        setChartData(chartsRes.data);
      } catch (error: unknown) {
        const status = getApiErrorStatus(error);
        if (status === 401) {
          logout();
          return;
        }
        if (scopeToUse === 'family' && status === 403) {
          setPanelScope('individual');
          toast.warning(t('dashboard.familyAccessFallback'));
          return;
        }
        toast.error(extractApiErrorMessage(error, t('dashboard.syncError')));
      }
    },
    [panelScope, chartMonth, logout, t],
  );

  useEffect(() => {
    const syncProfile = async () => {
      try {
        const res = await api.get('/users/me');
        updateUser(res.data);
      } catch (error: unknown) {
        if (getApiErrorStatus(error) === 401) {
          logout();
        }
      }
    };
    syncProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchFamilyStatus();
    requestDeviceNotificationPermission().catch(() => undefined);
  }, [fetchFamilyStatus]);

  useFamilyRealtimeSync({
    onDataChange: fetchData,
    onFamilyChange: fetchFamilyStatus,
    onUnauthorized: logout,
  });

  const handleBackRequestRef = useRef<() => boolean>(() => false);
  handleBackRequestRef.current = () => {
    if (showLogoutConfirm) {
      setShowLogoutConfirm(false);
      return true;
    }
    if (deleteConfig) {
      setDeleteConfig(null);
      return true;
    }
    if (undoPayTarget) {
      setUndoPayTarget(null);
      return true;
    }
    if (payingExpense) {
      setPayingExpense(null);
      return true;
    }
    if (payingBatchExpenses.length > 0) {
      setPayingBatchExpenses([]);
      return true;
    }
    if (payingInvoice) {
      setPayingInvoice(null);
      return true;
    }
    if (allocationModal !== null) {
      setAllocationModal(null);
      return true;
    }
    if (isInvestmentsModalOpen) {
      setIsInvestmentsModalOpen(false);
      setEditingInvestmentItem(null);
      return true;
    }
    if (isExpenseModalOpen) {
      setIsExpenseModalOpen(false);
      setEditingItem(null);
      return true;
    }
    if (isIncomeModalOpen) {
      setIsIncomeModalOpen(false);
      setEditingItem(null);
      return true;
    }
    if (isUserModalOpen) {
      setIsUserModalOpen(false);
      return true;
    }
    if (isFamilyModalOpen) {
      setIsFamilyModalOpen(false);
      return true;
    }
    if (activeInviteModal) {
      dismissedInviteIdsRef.current.add(activeInviteModal.id);
      setActiveInviteModal(null);
      return true;
    }
    if (categoryDetailState.isOpen) {
      setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
      return true;
    }
    if (activeTab !== 'overview') {
      setActiveTab('overview');
      return true;
    }
    setShowLogoutConfirm(true);
    return true;
  };

  useEffect(() => {
    const currentState = window.history.state as { dashboardGuard?: boolean } | null;
    if (!currentState?.dashboardGuard) {
      window.history.pushState({ dashboardGuard: true }, '', window.location.href);
    }

    const handlePopState = () => {
      window.history.pushState({ dashboardGuard: true }, '', window.location.href);
      handleBackRequestRef.current();
    };

    const win = window as Window & { __PM_HANDLE_BACK__?: () => boolean };
    win.__PM_HANDLE_BACK__ = () => handleBackRequestRef.current();

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete win.__PM_HANDLE_BACK__;
    };
  }, []);

  const handleScopeChange = (nextScope: PanelScope) => {
    setPanelScope(nextScope);
    setSelectedMemberFilter('all');
  };

  const handleDelete = async () => {
    if (!deleteConfig) return;
    try {
      setIsDeleteLoading(true);
      const endpoint =
        deleteConfig.type === 'expense'
          ? '/expenses'
          : deleteConfig.type === 'investment'
            ? '/balance/investments/items'
            : '/income';
      await api.delete(`${endpoint}/${deleteConfig.id}`);
      toast.success(
        deleteConfig.type === 'income'
          ? t('dashboard.deleteIncomeSuccess')
          : deleteConfig.type === 'investment'
            ? t('dashboard.deleteInvestmentSuccess')
            : t('dashboard.deleteExpenseSuccess'),
      );
      setDeleteConfig(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(
          error,
          deleteConfig.type === 'income'
            ? t('dashboard.deleteIncomeError')
            : deleteConfig.type === 'investment'
              ? t('dashboard.deleteInvestmentError')
              : t('dashboard.deleteExpenseError'),
        ),
      );
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleConfirmUndoPay = async () => {
    if (!undoPayTarget) return;
    try {
      setIsUndoPayLoading(true);
      await api.patch(`/expenses/${undoPayTarget.id}/undo-pay`, {});
      toast.success(t('expenses.undoPaymentSuccess'));
      setUndoPayTarget(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('expenses.undoPaymentError')));
    } finally {
      setIsUndoPayLoading(false);
    }
  };

  const handleGenerateCardInvoice = async (targetExpenses: ExpenseItem[]) => {
    if (targetExpenses.length === 0) return;
    try {
      const first = targetExpenses[0];
      const payload: {
        expenseIds: string[];
        cardBank?: string;
        cardLast4?: string;
      } = {
        expenseIds: targetExpenses.map((e) => e.id),
      };
      if (first.cardBank) payload.cardBank = first.cardBank;
      if (first.cardLast4) payload.cardLast4 = first.cardLast4;
      const res = await api.post<{ generatedCount?: number }>(
        '/expenses/credit-card/generate-invoice',
        payload,
      );
      toast.success(
        t('expenses.generateCardInvoiceSuccess', {
          count: res.data?.generatedCount ?? targetExpenses.length,
        }),
      );
      fetchData();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, t('expenses.generateCardInvoiceError')));
    }
  };

  const savedCards = useMemo(() => {
    const map = new Map<string, { cardBank?: string | null; cardLast4?: string | null }>();
    expenses.forEach((exp) => {
      const bank = (exp.cardBank || '').trim();
      const last4 = (exp.cardLast4 || '').trim();
      if (!bank && !last4) return;
      const key = `${bank.toLowerCase()}::${last4}`;
      if (!map.has(key)) {
        map.set(key, { cardBank: bank || null, cardLast4: last4 || null });
      }
    });
    return Array.from(map.values());
  }, [expenses]);

  const handleOpenAllocation = (variant: 'emergency' | 'investment' | 'food') => {
    if (variant === 'investment' || variant === 'emergency') {
      const ownExternal =
        variant === 'emergency'
          ? Number(balance.ownExternalEmergencyFund ?? 0)
          : Number(balance.ownExternalInvestments ?? 0);
      const ownAllocated =
        variant === 'emergency'
          ? Number(balance.ownAllocatedEmergencyFund ?? balance.ownEmergencyFund ?? 0)
          : Number(balance.ownAllocatedInvestments ?? 0);
      const defaultFromBalance = ownAllocated > 0 && ownExternal === 0;
      setSavingsFromBalance(defaultFromBalance);
      const initialVal = defaultFromBalance ? ownAllocated : ownExternal;
      setAllocationInput(formatNumberToCurrencyInput(initialVal));
    } else {
      const currentVal =
        balance.ownFoodAllowanceConfigured ??
        balance.ownFoodAllowanceTotal ??
        balance.foodAllowanceTotal ??
        0;
      setAllocationInput(formatNumberToCurrencyInput(currentVal));
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setFoodCreditDate(balance.ownFoodAllowanceDate || todayIso);
      setFoodIsRecurring(balance.ownFoodAllowanceRecurring ?? true);
    }
    setAllocationModal(variant);
  };

  const handleSavingsSourceChange = (fromBalance: boolean) => {
    setSavingsFromBalance(fromBalance);
    const nextVal =
      allocationModal === 'emergency'
        ? fromBalance
          ? Number(balance.ownAllocatedEmergencyFund ?? balance.ownEmergencyFund ?? 0)
          : Number(balance.ownExternalEmergencyFund ?? 0)
        : fromBalance
          ? Number(balance.ownAllocatedInvestments ?? 0)
          : Number(balance.ownExternalInvestments ?? 0);
    setAllocationInput(formatNumberToCurrencyInput(nextVal));
  };

  const handleReclassifyToExternal = async () => {
    if (!allocationModal || allocationModal === 'food') return;
    const isEmergency = allocationModal === 'emergency';
    try {
      setIsAllocationLoading(true);
      const endpoint = isEmergency ? '/balance/emergency-fund' : '/balance/investments';
      await api.post(endpoint, {
        amount: 0,
        reclassifyAllocatedToExternal: true,
      });
      toast.success(
        isEmergency
          ? t('dashboard.reclassifyEmergencySuccess')
          : t('dashboard.reclassifyInvestmentSuccess'),
      );
      setAllocationModal(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(
          error,
          isEmergency
            ? t('dashboard.reclassifyEmergencyError')
            : t('dashboard.reclassifyInvestmentError'),
        ),
      );
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationModal) return;

    const amount = parseCurrencyInput(allocationInput);
    if (isNaN(amount) || amount < 0) {
      toast.error(t('dashboard.invalidAmountError'));
      return;
    }

    const isEmergency = allocationModal === 'emergency';
    const isFood = allocationModal === 'food';
    const isInvestment = allocationModal === 'investment';

    if ((isEmergency || isInvestment) && savingsFromBalance) {
      const currentBucket = isEmergency
        ? Number(balance.ownAllocatedEmergencyFund ?? balance.ownEmergencyFund ?? 0)
        : Number(balance.ownAllocatedInvestments ?? 0);
      const maxLimit = Number(balance.ownBalance || 0) + currentBucket;

      if (amount > currentBucket + 0.001 && amount > maxLimit + 0.001) {
        toast.error(
          isEmergency
            ? t('dashboard.emergencyExceedsBalance')
            : t('dashboard.investmentExceedsBalance'),
        );
        return;
      }
    }

    try {
      setIsAllocationLoading(true);
      const endpoint = isFood
        ? '/balance/food-allowance'
        : isEmergency
          ? '/balance/emergency-fund'
          : '/balance/investments';
      const payload = isFood
        ? {
          amount,
          creditDate: foodCreditDate,
          isRecurring: foodIsRecurring,
        }
        : {
          amount,
          fromAvailableBalance: savingsFromBalance,
        };
      await api.post(endpoint, payload);
      toast.success(
        isFood
          ? t('dashboard.foodUpdatedToast')
          : isEmergency
            ? t('dashboard.emergencyUpdatedToast')
            : t('dashboard.investmentsUpdatedToast'),
      );
      setAllocationModal(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(
          error,
          isFood
            ? t('dashboard.foodUpdateError')
            : isEmergency
              ? t('dashboard.emergencyUpdateError')
              : t('dashboard.investmentsUpdateError'),
        ),
      );
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user?.name]);

  const currentPeriodLabel = useMemo(() => formatMonthLabel(currentMonthKey), [currentMonthKey]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseFilter !== 'todas' && e.status !== expenseFilter) return false;
      if (isFamilyMode && selectedMemberFilter !== 'all' && e.ownerId !== selectedMemberFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, expenseFilter, isFamilyMode, selectedMemberFilter]);

  const filteredIncomes = useMemo(() => {
    if (!isFamilyMode || selectedMemberFilter === 'all') return incomes;
    return incomes.filter((i) => i.ownerId === selectedMemberFilter);
  }, [incomes, isFamilyMode, selectedMemberFilter]);

  const filteredInvestmentItems = useMemo(() => {
    if (!isFamilyMode || selectedMemberFilter === 'all') return investmentItems;
    return investmentItems.filter((it) => it.ownerId === selectedMemberFilter);
  }, [investmentItems, isFamilyMode, selectedMemberFilter]);

  const selectedMemberObj = useMemo(() => {
    if (!isFamilyMode || selectedMemberFilter === 'all') return null;
    return (balance.memberBreakdown || []).find((m) => m.userId === selectedMemberFilter) || null;
  }, [balance.memberBreakdown, isFamilyMode, selectedMemberFilter]);

  const creditCardInvoices = useMemo<CreditCardInvoiceGroup[]>(() => {
    const map = new Map<string, ExpenseItem[]>();
    expenses.forEach((exp) => {
      if (exp.isPaid || (isFamilyMode && !exp.isOwn) || !exp.isCreditCard || !exp.dueDate) {
        return;
      }
      const monthKey = String(exp.dueDate).slice(0, 7);
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(exp);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, items]) => {
        const [yearStr, monthStr] = month.split('-');
        const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
        const locale = getActiveLocale();
        const fullMonth = dateObj.toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        });
        const shortMonth = dateObj
          .toLocaleDateString(locale, { month: 'short' })
          .replace('.', '');
        const total = items.reduce((sum, item) => sum + Number(item.value), 0);

        return {
          month,
          label: fullMonth.charAt(0).toUpperCase() + fullMonth.slice(1),
          shortLabel: `${shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1)}/${yearStr}`,
          total: Number(total.toFixed(2)),
          items,
        };
      });
  }, [expenses, isFamilyMode]);

  const activeInvoice = useMemo(() => {
    if (creditCardInvoices.length === 0) return null;
    return (
      creditCardInvoices.find((inv) => inv.month === selectedInvoiceMonth) ||
      creditCardInvoices[0]
    );
  }, [creditCardInvoices, selectedInvoiceMonth]);

  const pendingInvites = familyStatus?.pendingReceivedInvites || [];

  const allocatedSavingsForModal =
    allocationModal === 'emergency'
      ? Number(balance.ownAllocatedEmergencyFund ?? balance.ownEmergencyFund ?? 0)
      : Number(balance.ownAllocatedInvestments ?? 0);

  const externalSavingsForModal =
    allocationModal === 'emergency'
      ? Number(balance.ownExternalEmergencyFund ?? 0)
      : Number(balance.ownExternalInvestments ?? 0);

  const allocationMaxLimit =
    allocationModal && allocationModal !== 'food' && savingsFromBalance
      ? Number(balance.ownBalance || 0) + allocatedSavingsForModal
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar
        userId={user?.id}
        userName={user?.name}
        userInitials={userInitials}
        userAvatarUrl={user?.avatarUrl}
        onOpenProfileModal={() => setIsUserModalOpen(true)}
        onRequestLogout={() => setShowLogoutConfirm(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow w-full space-y-6 sm:space-y-8">
        {pendingInvites.length > 0 && (
          <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 shadow-executive-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                {React.createElement(FaBell as unknown as React.ComponentType<{ className?: string }>, { className: 'text-sm' })}
              </span>
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">
                  {t('dashboard.pendingInvitesTitle', { count: pendingInvites.length })}
                </p>
                <p className="text-slate-300 text-xs mt-0.5">
                  {t('dashboard.pendingInvitesSubtitle', {
                    name: pendingInvites[0].inviterName,
                    cpf: pendingInvites[0].inviterMaskedCpf,
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveInviteModal(pendingInvites[0])}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors self-start sm:self-center whitespace-nowrap"
            >
              {t('dashboard.reviewInviteButton')}
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {currentPeriodLabel}{' '}
                {isFamilyMode ? `· ${t('dashboard.familyPanelActive')}` : ''}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {isFamilyMode ? t('dashboard.familyPanelActive') : t('dashboard.overviewTab')}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'overview' && !categoryDetailState.isOpen
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {React.createElement(FaThLarge as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
                  {t('dashboard.overviewTab')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('history');
                    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'history' && !categoryDetailState.isOpen
                    ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {React.createElement(FaHistory as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
                  {t('dashboard.historyTab')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFamilyModalOpen(true)}
                data-testid="dashboard-family-btn"
                title={t('navbar.familyTooltip')}
                className={`group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                  isFamilyMode
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                    isFamilyMode
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60'
                  }`}
                >
                  {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
                </span>
                <span>{t('navbar.familyScope')}</span>
                {familyStatus?.inFamily && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                      isFamilyMode
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {familyStatus.members?.length || 2}
                  </span>
                )}
                {pendingInvites.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {pendingInvites.length}
                  </span>
                )}
              </button>

              {familyStatus?.inFamily && (
                <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleScopeChange('individual')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${panelScope === 'individual'
                      ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {React.createElement(FaUser as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[10px]' })}
                    {t('navbar.individualScope')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('family')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${panelScope === 'family'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {React.createElement(FaUsers as unknown as React.ComponentType<{ className?: string }>, { className: 'text-[11px]' })}
                    {t('navbar.familyScope')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsIncomeModalOpen(true);
              }}
              className="exec-btn-secondary w-full sm:w-44 h-11 gap-2 whitespace-nowrap justify-center"
            >
              {React.createElement(FaPlus as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs text-emerald-600 dark:text-emerald-400' })}
              <span>{t('dashboard.newIncomeBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsExpenseModalOpen(true);
              }}
              className="exec-btn-primary w-full sm:w-44 h-11 gap-2 whitespace-nowrap justify-center"
            >
              {React.createElement(FaPlus as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
              <span>{t('dashboard.newExpenseBtn')}</span>
            </button>
          </div>
        </div>

        {isFamilyMode && (
          <FamilyMembersStrip
            members={balance.memberBreakdown || []}
            selectedMemberId={selectedMemberFilter}
            onSelectMember={setSelectedMemberFilter}
            onOpenPrivacySettings={() => setIsFamilyModalOpen(true)}
          />
        )}

        {categoryDetailState.isOpen ? (
          <CategoryDetailsView
            selectedMonth={categoryDetailState.month}
            initialCategory={categoryDetailState.initialCategory}
            expenses={
              isFamilyMode && selectedMemberFilter !== 'all'
                ? expenses.filter((e) => e.ownerId === selectedMemberFilter)
                : expenses
            }
            isFamilyMode={isFamilyMode}
            onSelectMonth={(nextMonth) =>
              setCategoryDetailState((prev) => ({ ...prev, month: nextMonth }))
            }
            onBack={() =>
              setCategoryDetailState((prev) => ({
                ...prev,
                isOpen: false,
                initialCategory: null,
              }))
            }
          />
        ) : activeTab === 'history' ? (
          <HistoryTab
            selectedMonth={selectedHistoryMonth}
            onSelectMonth={setSelectedHistoryMonth}
            chartData={chartData}
            expenses={
              isFamilyMode && selectedMemberFilter !== 'all'
                ? expenses.filter((e) => e.ownerId === selectedMemberFilter)
                : expenses
            }
            incomes={filteredIncomes}
            isFamilyMode={isFamilyMode}
            onOpenCategoryDetail={(catName) =>
              setCategoryDetailState({
                isOpen: true,
                month: selectedHistoryMonth,
                initialCategory: catName || null,
              })
            }
          />
        ) : (
          <>
            <KpiGrid
              balance={balance}
              incomesCount={incomes.length}
              isFamilyMode={isFamilyMode}
              onOpenEmergencyModal={() => handleOpenAllocation('emergency')}
              onOpenInvestmentModal={() => {
                setEditingInvestmentItem(null);
                setIsInvestmentsModalOpen(true);
              }}
              onOpenFoodAllowanceModal={() => handleOpenAllocation('food')}
            />

            <MonthlyChartsSection
              periodLabel={currentPeriodLabel}
              monthKey={currentMonthKey}
              expenses={
                isFamilyMode && selectedMemberFilter !== 'all'
                  ? expenses.filter((e) => e.ownerId === selectedMemberFilter)
                  : expenses
              }
              chartData={chartData}
              onOpenCategoryDetail={(catName) =>
                setCategoryDetailState({
                  isOpen: true,
                  month: currentMonthKey,
                  initialCategory: catName || null,
                })
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                <CreditCardInvoicePanel
                  invoices={creditCardInvoices}
                  activeInvoice={activeInvoice}
                  onSelectMonth={setSelectedInvoiceMonth}
                  onPayInvoice={setPayingInvoice}
                />

                <ExpensesListSection
                  expenses={filteredExpenses}
                  expenseFilter={expenseFilter}
                  isFamilyMode={isFamilyMode}
                  openInstallments={openInstallments}
                  onChangeFilter={setExpenseFilter}
                  onToggleInstallment={(id) =>
                    setOpenInstallments((prev) =>
                      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
                    )
                  }
                  onPayExpense={setPayingExpense}
                  onPayBatchExpenses={setPayingBatchExpenses}
                  onUndoPayment={setUndoPayTarget}
                  onGenerateCardInvoice={handleGenerateCardInvoice}
                  onEditExpense={(item) => {
                    setEditingItem({ ...item, type: 'expense' });
                    setIsExpenseModalOpen(true);
                  }}
                  onDeleteExpense={(id) => setDeleteConfig({ id, type: 'expense' })}
                />
              </div>

              <IncomesListSection
                incomes={filteredIncomes}
                isFamilyMode={isFamilyMode}
                onAddIncome={() => {
                  setEditingItem(null);
                  setIsIncomeModalOpen(true);
                }}
                onEditIncome={(item) => {
                  setEditingItem({ ...item, type: 'income' });
                  setIsIncomeModalOpen(true);
                }}
                onDeleteIncome={(id) => setDeleteConfig({ id, type: 'income' })}
              />
            </div>

            <InvestmentsListSection
              items={filteredInvestmentItems}
              isFamilyMode={isFamilyMode}
              selectedMember={selectedMemberObj}
              onAddInvestment={() => {
                setEditingInvestmentItem(null);
                setIsInvestmentsModalOpen(true);
              }}
              onEditInvestment={(item) => {
                setEditingInvestmentItem(item);
                setIsInvestmentsModalOpen(true);
              }}
              onDeleteInvestment={(id) => setDeleteConfig({ id, type: 'investment' })}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4 text-center mt-auto transition-colors duration-300">
        <p className="text-xs text-slate-400">
          {t('dashboard.footerText')} &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={fetchData}
        initialData={editingItem?.type === 'expense' ? editingItem : null}
        savedCards={savedCards}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={fetchData}
        initialData={editingItem?.type === 'income' ? editingItem : null}
      />

      <PayExpenseModal
        expense={payingExpense}
        batchExpenses={payingBatchExpenses}
        savedCards={savedCards}
        onClose={() => {
          setPayingExpense(null);
          setPayingBatchExpenses([]);
        }}
        onSuccess={fetchData}
      />

      <PayCreditCardModal
        invoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onSuccess={fetchData}
      />

      <FamilyModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        familyStatus={familyStatus}
        onRefresh={() => {
          fetchFamilyStatus();
          fetchData();
        }}
        onOpenProfile={() => setIsUserModalOpen(true)}
      />

      <FamilyInviteModal
        invite={activeInviteModal}
        onClose={() => {
          if (activeInviteModal) {
            dismissedInviteIdsRef.current.add(activeInviteModal.id);
          }
          setActiveInviteModal(null);
        }}
        onAccepted={() => {
          setActiveInviteModal(null);
          fetchFamilyStatus();
          setPanelScope('family');
          fetchData('family');
        }}
        onRejected={() => {
          setActiveInviteModal(null);
          fetchFamilyStatus();
        }}
      />

      <ConfirmationModal
        isOpen={!!deleteConfig}
        onClose={() => setDeleteConfig(null)}
        onConfirm={handleDelete}
        title={
          deleteConfig?.type === 'income'
            ? t('dashboard.deleteIncomeTitle')
            : deleteConfig?.type === 'investment'
              ? t('dashboard.deleteInvestmentTitle')
              : t('dashboard.deleteExpenseTitle')
        }
        message={
          deleteConfig?.type === 'income'
            ? t('dashboard.deleteIncomeGenericMsg')
            : deleteConfig?.type === 'investment'
              ? t('dashboard.deleteInvestmentGenericMsg')
              : t('dashboard.deleteExpenseGenericMsg')
        }
        confirmText={t('common.delete')}
        isLoading={isDeleteLoading}
      />

      <ConfirmationModal
        isOpen={!!undoPayTarget}
        onClose={() => setUndoPayTarget(null)}
        onConfirm={handleConfirmUndoPay}
        title={t('expenses.undoPaymentTitle')}
        message={t('expenses.undoPaymentConfirmMsg', { name: undoPayTarget?.name || '' })}
        confirmText={t('expenses.undoPaymentConfirmBtn')}
        isLoading={isUndoPayLoading}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title={t('dashboard.logoutConfirmTitle')}
        message={t('dashboard.logoutConfirmMsg')}
        confirmText={t('dashboard.logoutConfirmBtn')}
      />

      {user && (
        <UserEditModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          userData={{
            name: user.name,
          }}
          onSuccess={async () => {
            try {
              const res = await api.get('/users/me');
              updateUser(res.data);
              fetchFamilyStatus();
            } catch (error: unknown) {
              toast.error(extractApiErrorMessage(error, t('dashboard.sessionExpired')));
              logout();
            }
          }}
        />
      )}

      <AllocationModal
        isOpen={allocationModal !== null}
        variant={allocationModal || 'emergency'}
        value={allocationInput}
        creditDate={foodCreditDate}
        isRecurring={foodIsRecurring}
        maxLimit={allocationMaxLimit}
        usedAmount={balance.ownFoodAllowanceUsed ?? balance.foodAllowanceUsed ?? 0}
        ownAvailableBalance={balance.ownBalance ?? balance.balance ?? 0}
        savingsFromBalance={savingsFromBalance}
        allocatedSavings={allocatedSavingsForModal}
        externalSavings={externalSavingsForModal}
        loading={isAllocationLoading}
        onChangeValue={setAllocationInput}
        onChangeCreditDate={setFoodCreditDate}
        onChangeIsRecurring={setFoodIsRecurring}
        onChangeSavingsFromBalance={handleSavingsSourceChange}
        onReclassifyToExternal={handleReclassifyToExternal}
        onClose={() => setAllocationModal(null)}
        onSubmit={handleAllocationSubmit}
      />

      <InvestmentsModal
        isOpen={isInvestmentsModalOpen}
        items={investmentItems}
        ownAvailableBalance={balance.ownBalance ?? balance.balance ?? 0}
        allocatedInvestments={balance.ownAllocatedInvestments ?? 0}
        externalInvestments={balance.ownExternalInvestments ?? 0}
        initialEditItem={editingInvestmentItem}
        onClose={() => {
          setIsInvestmentsModalOpen(false);
          setEditingInvestmentItem(null);
        }}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default Dashboard;
