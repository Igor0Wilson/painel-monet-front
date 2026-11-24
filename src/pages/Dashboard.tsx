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
import {
  FaBell,
  FaChevronRight,
  FaCreditCard,
  FaHistory,
  FaLayerGroup,
  FaPlus,
  FaSeedling,
  FaTimes,
  FaUser,
  FaUsers,
  FaUtensils,
  FaWallet,
} from 'react-icons/fa';
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
import FoodVoucherSection from '../components/dashboard/FoodVoucherSection';
import IncomesListSection from '../components/dashboard/IncomesListSection';
import InvestmentsListSection from '../components/dashboard/InvestmentsListSection';
import InvestmentsModal from '../components/dashboard/InvestmentsModal';
import KpiGrid from '../components/dashboard/KpiGrid';
import MonthlyChartsSection from '../components/dashboard/MonthlyChartsSection';
import Navbar from '../components/dashboard/Navbar';
import AppSidebar, { MobileAppHeader } from '../components/dashboard/AppSidebar';
import WebModuleSidebar from '../components/dashboard/WebModuleSidebar';
import AppLockOverlay from '../components/auth/AppLockOverlay';
import { useAuth } from '../context/AuthContext';
import { isRunningInInstalledApp } from '../utils/appEnvironment';
import {
  type BiometricCredentialView,
  syncLocalBiometricPointersWithServer,
} from '../utils/biometricAuth';
import {
  syncSecurityPinDeviceToken,
} from '../utils/securityLockAuth';
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
  DueExpenseReminderItem,
  notifyDueExpenseOnDevice,
  notifyFamilyInviteOnDevice,
  requestDeviceNotificationPermission,
} from '../utils/deviceNotifications';
import { extractApiErrorMessage, getApiErrorStatus } from '../utils/errorHandler';
import {
  formatCurrency,
  formatMonthLabel,
  formatMonthShortLabel,
  formatNumberToCurrencyInput,
  getCurrentMonthKey,
  parseCurrencyInput,
} from '../utils/formatters';
import { getTodayLocalIso, projectExpensesForMonth } from '../utils/recurrence';

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
  const { t, i18n } = useTranslation();
  const { user, logout, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [panelScope, setPanelScope] = useState<PanelScope>('individual');
  const [isInstalledApp, setIsInstalledApp] = useState<boolean>(() => isRunningInInstalledApp());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [hasSecurityPin, setHasSecurityPin] = useState(false);
  const [accountAuthProvider, setAccountAuthProvider] = useState<'password' | 'google'>('password');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(getCurrentMonthKey());
  const [selectedIncomeMonth, setSelectedIncomeMonth] = useState<string>(getCurrentMonthKey());
  const [selectedFoodMonth, setSelectedFoodMonth] = useState<string>(getCurrentMonthKey());
  const [editingIncomeMonth, setEditingIncomeMonth] = useState<string | null>(null);
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
    isRecurring?: boolean;
    isInstallment?: boolean;
    targetMonth?: string;
    name?: string;
    scope?: 'only_month' | 'from_month' | 'all' | 'all_installments';
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
  const [foodCreditDate, setFoodCreditDate] = useState<string>(() => getTodayLocalIso());
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

  const dueReminderCheckInFlightRef = useRef(false);

  const checkDueReminders = useCallback(async () => {
    if (dueReminderCheckInFlightRef.current) return;
    dueReminderCheckInFlightRef.current = true;
    try {
      const res = await api.get<{
        serverDate: string;
        reminders: DueExpenseReminderItem[];
      }>('/expenses/due-reminders');
      const list = Array.isArray(res.data?.reminders) ? res.data.reminders : [];
      const ackIds: string[] = [];

      for (const item of list) {
        if (item.alreadyDeviceNotified) continue;
        const notified = await notifyDueExpenseOnDevice(item);
        if (notified) {
          ackIds.push(item.id);
          const msg =
            item.kind === 'due_today'
              ? t('modals.notifications.expenseDueTodayBody', {
                  name: item.expenseName,
                  amount: formatCurrency(Number(item.amount || 0)),
                  date: item.dueDate.split('-').reverse().join('/'),
                })
              : t('modals.notifications.expenseDueTomorrowBody', {
                  name: item.expenseName,
                  amount: formatCurrency(Number(item.amount || 0)),
                  date: item.dueDate.split('-').reverse().join('/'),
                });
          if (item.kind === 'due_today') {
            toast.warn(msg);
          } else {
            toast.info(msg);
          }
        }
      }

      if (ackIds.length > 0) {
        await api.post('/expenses/due-reminders/ack', { ids: ackIds }).catch(() => undefined);
      }
    } catch {
      // Silencioso: lembretes não bloqueiam o carregamento principal
    } finally {
      dueReminderCheckInFlightRef.current = false;
    }
  }, [t]);

  const syncDeviceSecurityState = useCallback(async () => {
    try {
      const [credsRes, pinSync] = await Promise.all([
        api.get<BiometricCredentialView[]>('/auth/biometric/credentials').catch(() => null),
        syncSecurityPinDeviceToken(user?.name).catch(() => null),
      ]);
      if (credsRes && Array.isArray(credsRes.data)) {
        syncLocalBiometricPointersWithServer(credsRes.data, user?.id);
      }
      if (pinSync) {
        setHasSecurityPin(Boolean(pinSync.hasPin));
        setAccountAuthProvider(pinSync.authProvider);
      }
    } catch {
      // Keep cached security pointers if offline
    }
  }, [user?.id, user?.name]);

  useEffect(() => {
    fetchFamilyStatus();
    void Promise.resolve(syncDeviceSecurityState()).catch(() => undefined);
    void Promise.resolve(requestDeviceNotificationPermission()).catch(() => undefined);
  }, [fetchFamilyStatus, syncDeviceSecurityState]);

  useEffect(() => {
    const unpaidCount = expenses.filter((e) => !e.isPaid).length;
    if (unpaidCount > 0) {
      checkDueReminders().catch(() => undefined);
    }
  }, [expenses, checkDueReminders]);

  useFamilyRealtimeSync({
    onDataChange: fetchData,
    onFamilyChange: fetchFamilyStatus,
    onUnauthorized: logout,
  });

  const handleBackRequestRef = useRef<() => boolean>(() => false);
  handleBackRequestRef.current = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return true;
    }
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
    setIsInstalledApp(isRunningInInstalledApp());
  }, []);

  useEffect(() => {
    if (!isInstalledApp) return undefined;

    const handleAppLifecycle = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string }>).detail;
      if (detail?.state === 'background' || detail?.state === 'resume_lock') {
        setIsAppLocked(true);
      }
    };

    let wasPwaHidden = false;
    const handleVisibilityChange = () => {
      const win = window as unknown as {
        ReactNativeWebView?: unknown;
        __PM_SUPPRESS_VISIBILITY_LOCK_UNTIL__?: number;
      };
      if (win.ReactNativeWebView) return;
      if (
        win.__PM_SUPPRESS_VISIBILITY_LOCK_UNTIL__ &&
        Date.now() < win.__PM_SUPPRESS_VISIBILITY_LOCK_UNTIL__
      ) {
        return;
      }
      if (document.visibilityState === 'hidden') {
        wasPwaHidden = true;
        setIsAppLocked(true);
      } else if (document.visibilityState === 'visible' && wasPwaHidden) {
        wasPwaHidden = false;
        setIsAppLocked(true);
      }
    };

    window.addEventListener('PM_APP_LIFECYCLE', handleAppLifecycle);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('PM_APP_LIFECYCLE', handleAppLifecycle);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInstalledApp]);

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
      const params: Record<string, string> = {};
      if (deleteConfig.type !== 'investment') {
        if (deleteConfig.scope) {
          params.scope = deleteConfig.scope;
        }
        if (deleteConfig.targetMonth && deleteConfig.scope && deleteConfig.scope !== 'all' && deleteConfig.scope !== 'all_installments') {
          params.month = deleteConfig.targetMonth;
        }
      }
      await api.delete(`${endpoint}/${deleteConfig.id}`, {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
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

  const currentPeriodLabel = useMemo(
    () => formatMonthLabel(currentMonthKey, i18n.language),
    [currentMonthKey, i18n.language],
  );

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
        const [yearStr] = month.split('-');
        const fullMonth = formatMonthLabel(month, i18n.language);
        const shortMonth = formatMonthShortLabel(month);
        const total = items.reduce((sum, item) => sum + Number(item.value), 0);

        return {
          month,
          label: fullMonth,
          shortLabel: `${shortMonth}/${yearStr}`,
          total: Number(total.toFixed(2)),
          items,
        };
      });
  }, [expenses, isFamilyMode, i18n.language]);

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

  const currentMonthExpensesProjected = useMemo(
    () => projectExpensesForMonth(filteredExpenses, currentMonthKey),
    [filteredExpenses, currentMonthKey],
  );

  const openBillsCount = useMemo(
    () => currentMonthExpensesProjected.filter((e) => !e.isPaid).length,
    [currentMonthExpensesProjected],
  );

  const openCreditCardsTotal = useMemo(
    () =>
      Number(
        filteredExpenses
          .filter((e) => !e.isPaid && (e.isCreditCard || e.paymentMethod === 'credito'))
          .reduce((s, e) => s + Number(e.value || 0), 0)
          .toFixed(2),
      ),
    [filteredExpenses],
  );

  const activeAppHeaderTitle = categoryDetailState.isOpen
    ? t('charts.categoryTitle')
    : activeTab === 'history'
      ? t('dashboard.historyTab')
      : activeTab === 'finances'
        ? t('dashboard.navTabs.finances')
        : activeTab === 'incomes'
          ? t('dashboard.navTabs.incomes')
          : activeTab === 'expenses'
            ? t('dashboard.navTabs.expenses')
            : activeTab === 'cards'
              ? t('dashboard.navTabs.cards')
              : activeTab === 'food'
                ? t('dashboard.navTabs.food')
                : activeTab === 'investments'
                  ? t('dashboard.navTabs.investments')
                  : isFamilyMode
                    ? t('sidebar.familyPanel')
                    : t('sidebar.individualPanel');

  const handleSelectIndividualPanel = () => {
    handleScopeChange('individual');
    setActiveTab('overview');
    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectFamilyPanel = () => {
    if (!familyStatus?.inFamily) return;
    handleScopeChange('family');
    setActiveTab('overview');
    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectHistoryTab = () => {
    setActiveTab('history');
    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectTab = (nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
  };

  const sharedExpensesProps = {
    expenses: filteredExpenses,
    expenseFilter,
    isFamilyMode,
    openInstallments,
    onChangeFilter: setExpenseFilter,
    onToggleInstallment: (id: string) =>
      setOpenInstallments((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      ),
    onPayExpense: setPayingExpense,
    onPayBatchExpenses: setPayingBatchExpenses,
    onUndoPayment: setUndoPayTarget,
    onGenerateCardInvoice: handleGenerateCardInvoice,
    onOpenCardsSection: () => handleSelectTab('cards'),
    onEditExpense: (item: ExpenseItem) => {
      setEditingItem({ ...item, type: 'expense' });
      setIsExpenseModalOpen(true);
    },
    onDeleteExpense: (id: string) => setDeleteConfig({ id, type: 'expense' }),
    onDeleteExpenseWithItem: (exp: ExpenseItem) =>
      setDeleteConfig({
        id: exp.id,
        type: 'expense',
        isRecurring: exp.isRecurring,
        isInstallment: exp.isInstallment,
        targetMonth:
          exp._occurrenceMonth ||
          String(exp.dueDate || '').slice(0, 7) ||
          currentMonthKey,
        name: exp.name,
        scope: exp.isRecurring ? 'only_month' : undefined,
      }),
  };

  const sharedIncomesProps = {
    incomes: filteredIncomes,
    isFamilyMode,
    selectedMonth: selectedIncomeMonth,
    onSelectMonth: setSelectedIncomeMonth,
    onAddIncome: () => {
      setEditingItem(null);
      setEditingIncomeMonth(null);
      setIsIncomeModalOpen(true);
    },
    onEditIncome: (item: IncomeItem, targetMonth?: string) => {
      setEditingItem({ ...item, type: 'income' });
      setEditingIncomeMonth(targetMonth || null);
      setIsIncomeModalOpen(true);
    },
    onDeleteIncome: (id: string) => setDeleteConfig({ id, type: 'income' }),
    onDeleteIncomeWithMonth: (item: IncomeItem, monthKey?: string) =>
      setDeleteConfig({
        id: item.id,
        type: 'income',
        isRecurring: item.isRecurring,
        targetMonth: monthKey || selectedIncomeMonth,
        name: item.name,
        scope: item.isRecurring ? 'only_month' : 'all',
      }),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <div
        aria-hidden={isAppLocked}
        className={isAppLocked ? 'invisible pointer-events-none select-none flex-1 flex flex-col' : 'flex-1 flex flex-col'}
      >
      {!isInstalledApp && (
        <Navbar
          userId={user?.id}
          userName={user?.name}
          userInitials={userInitials}
          userAvatarUrl={user?.avatarUrl}
          onOpenProfileModal={() => setIsUserModalOpen(true)}
          onRequestLogout={() => setShowLogoutConfirm(true)}
        />
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {isInstalledApp ? (
          <AppSidebar
            isOpen={isSidebarOpen}
            onOpen={() => setIsSidebarOpen(true)}
            onClose={() => setIsSidebarOpen(false)}
            userId={user?.id}
            userName={user?.name}
            userInitials={userInitials}
            userAvatarUrl={user?.avatarUrl}
            activeTab={activeTab}
            panelScope={panelScope}
            isCategoryDetailOpen={categoryDetailState.isOpen}
            inFamily={Boolean(familyStatus?.inFamily)}
            familyMembersCount={familyStatus?.members?.length || 2}
            pendingInvitesCount={pendingInvites.length}
            onSelectIndividualPanel={handleSelectIndividualPanel}
            onSelectFamilyPanel={handleSelectFamilyPanel}
            onSelectHistory={handleSelectHistoryTab}
            onSelectTab={handleSelectTab}
            onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
            onOpenProfileModal={() => setIsUserModalOpen(true)}
            onRequestLogout={() => setShowLogoutConfirm(true)}
          />
        ) : (
          <WebModuleSidebar
            activeTab={activeTab}
            isCategoryDetailOpen={categoryDetailState.isOpen}
            onSelectTab={handleSelectTab}
            openBillsCount={openBillsCount}
            cardsPendingCount={creditCardInvoices.length}
            incomesCount={filteredIncomes.length}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {isInstalledApp && (
            <MobileAppHeader
              activeTitle={activeAppHeaderTitle}
              userName={user?.name}
              userInitials={userInitials}
              userAvatarUrl={user?.avatarUrl}
              pendingInvitesCount={pendingInvites.length}
              isSidebarOpen={isSidebarOpen}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              onOpenProfileModal={() => setIsUserModalOpen(true)}
            />
          )}

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
                    {isFamilyMode
                      ? t('dashboard.familyPanelActive')
                      : t(`dashboard.navTabs.${activeTab}`)}
                  </h1>
                </div>

                {!isInstalledApp && (
                  <div className="flex flex-wrap items-center gap-2.5">
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
                )}
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
        ) : activeTab === 'finances' ? (
          <div
            data-testid="finances-combined-section"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            <div className="lg:col-span-8">
              <ExpensesListSection {...sharedExpensesProps} />
            </div>
            <IncomesListSection {...sharedIncomesProps} />
          </div>
        ) : activeTab === 'incomes' ? (
          <IncomesListSection {...sharedIncomesProps} />
        ) : activeTab === 'expenses' ? (
          <ExpensesListSection {...sharedExpensesProps} />
        ) : activeTab === 'cards' ? (
          <CreditCardInvoicePanel
            invoices={creditCardInvoices}
            activeInvoice={activeInvoice}
            onSelectMonth={setSelectedInvoiceMonth}
            onPayInvoice={setPayingInvoice}
            expenses={filteredExpenses}
            selectedMonth={selectedInvoiceMonth}
            onPayExpense={setPayingExpense}
            onEditExpense={(item) => {
              setEditingItem({ ...item, type: 'expense' });
              setIsExpenseModalOpen(true);
            }}
            onGenerateCardInvoice={handleGenerateCardInvoice}
            onRefresh={fetchData}
          />
        ) : activeTab === 'food' ? (
          <FoodVoucherSection
            balance={balance}
            expenses={expenses}
            onRefresh={fetchData}
            selectedMonth={selectedFoodMonth}
            onSelectMonth={setSelectedFoodMonth}
          />
        ) : activeTab === 'investments' ? (
          <InvestmentsListSection
            items={filteredInvestmentItems}
            isFamilyMode={isFamilyMode}
            selectedMember={selectedMemberObj}
            balance={balance}
            onRefresh={fetchData}
            onOpenEmergencyModal={() => handleOpenAllocation('emergency')}
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

            {/* Session Quick-Access Hub */}
            <section
              data-testid="overview-session-hub"
              className="exec-card p-6 space-y-4"
            >
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('dashboard.overviewHub.quickAccessTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.overviewHub.quickAccessSubtitle')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'finances' as ActiveTab,
                      title: t('dashboard.navTabs.finances'),
                      metric: `${t('dashboard.cardInvoices.summaryPendingCount', {
                        count: openBillsCount,
                      })} · ${t('incomes.subtitleCount', { count: filteredIncomes.length })}`,
                      icon: FaLayerGroup,
                      tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
                    },
                    {
                      id: 'cards' as ActiveTab,
                      title: t('dashboard.navTabs.cards'),
                      metric: formatCurrency(openCreditCardsTotal),
                      icon: FaCreditCard,
                      tone: 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800',
                    },
                    {
                      id: 'incomes' as ActiveTab,
                      title: t('dashboard.navTabs.incomes'),
                      metric: t('incomes.subtitleCount', { count: filteredIncomes.length }),
                      icon: FaWallet,
                      tone: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
                    },
                    {
                      id: 'food' as ActiveTab,
                      title: t('dashboard.navTabs.food'),
                      metric: formatCurrency(balance.foodAllowance || 0),
                      icon: FaUtensils,
                      tone: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
                    },
                    {
                      id: 'investments' as ActiveTab,
                      title: t('dashboard.navTabs.investments'),
                      metric: formatCurrency(
                        (balance.investments || 0) + (balance.emergencyFund || 0),
                      ),
                      icon: FaSeedling,
                      tone: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40',
                    },
                    {
                      id: 'history' as ActiveTab,
                      title: t('dashboard.navTabs.history'),
                      metric: formatMonthLabel(selectedHistoryMonth),
                      icon: FaHistory,
                      tone: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
                    },
                  ]
                ).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    data-testid={`hub-card-${card.id}`}
                    onClick={() => handleSelectTab(card.id)}
                    className="group rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 p-4 text-left transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tone}`}
                      >
                        {React.createElement(
                          card.icon as unknown as React.ComponentType<{ className?: string }>,
                          { className: 'text-sm' },
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {card.title}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums truncate">
                          {card.metric}
                        </p>
                      </div>
                    </div>
                    {React.createElement(
                      FaChevronRight as unknown as React.ComponentType<{ className?: string }>,
                      { className: 'text-xs text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0' },
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer
        data-testid="dashboard-footer"
        className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4 mt-auto transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <img
            src="/wss-prime-logo.png"
            alt="WSS Prime"
            className="h-9 w-auto rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-700 object-contain"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('dashboard.footerText')} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
        </div>
      </div>

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
          setEditingIncomeMonth(null);
        }}
        onSuccess={fetchData}
        initialData={editingItem?.type === 'income' ? editingItem : null}
        targetMonth={editingIncomeMonth}
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

      {deleteConfig &&
        (deleteConfig.isRecurring ||
          (deleteConfig.type === 'expense' && deleteConfig.isInstallment)) && (
          <div className="exec-modal-overlay z-50">
            <div className="exec-modal-container max-w-md p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t('dashboard.scopeEdit.deleteTitle')}
                  </h3>
                  {deleteConfig.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {deleteConfig.name}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfig(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {React.createElement(
                    FaTimes as unknown as React.ComponentType<{ className?: string }>,
                    { className: 'text-sm' },
                  )}
                </button>
              </div>

              <div className="space-y-2">
                {deleteConfig.isRecurring ? (
                  (
                    [
                      {
                        id: 'only_month' as const,
                        label: t('dashboard.scopeEdit.onlyMonth', {
                          month: formatMonthLabel(deleteConfig.targetMonth || currentMonthKey),
                        }),
                        desc: t('dashboard.scopeEdit.onlyMonthDesc'),
                      },
                      {
                        id: 'from_month' as const,
                        label: t('dashboard.scopeEdit.fromMonth', {
                          month: formatMonthLabel(deleteConfig.targetMonth || currentMonthKey),
                        }),
                        desc: t('dashboard.scopeEdit.fromMonthDesc', {
                          month: formatMonthLabel(deleteConfig.targetMonth || currentMonthKey),
                        }),
                      },
                      {
                        id: 'all' as const,
                        label: t('dashboard.scopeEdit.all'),
                        desc: t('dashboard.scopeEdit.allDesc'),
                      },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setDeleteConfig((prev) => (prev ? { ...prev, scope: opt.id } : null))
                      }
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        (deleteConfig.scope || 'only_month') === opt.id
                          ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))
                ) : (
                  (
                    [
                      {
                        id: undefined,
                        label: t('dashboard.scopeEdit.singleInstallment'),
                        desc: t('dashboard.scopeEdit.singleInstallmentDesc'),
                      },
                      {
                        id: 'all_installments' as const,
                        label: t('dashboard.scopeEdit.allInstallments'),
                        desc: t('dashboard.scopeEdit.allInstallmentsDesc'),
                      },
                    ]
                  ).map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setDeleteConfig((prev) => (prev ? { ...prev, scope: opt.id } : null))
                      }
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        deleteConfig.scope === opt.id
                          ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfig(null)}
                  className="exec-btn-secondary px-4 py-2 text-xs"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isDeleteLoading}
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {t('dashboard.scopeEdit.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        )}

      <ConfirmationModal
        isOpen={
          !!deleteConfig &&
          !deleteConfig.isRecurring &&
          !(deleteConfig.type === 'expense' && deleteConfig.isInstallment)
        }
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
              syncDeviceSecurityState().catch(() => undefined);
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

      <AppLockOverlay
        isLocked={isAppLocked}
        hasPinConfigured={hasSecurityPin}
        authProvider={accountAuthProvider}
        userName={user?.name}
        onUnlocked={() => {
          setIsAppLocked(false);
          syncDeviceSecurityState().catch(() => undefined);
          fetchData();
        }}
        onLogout={() => {
          setIsAppLocked(false);
          logout();
        }}
      />
    </div>
  );
};

export default Dashboard;
