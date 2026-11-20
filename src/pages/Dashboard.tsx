import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PanelScope,
} from '../types/finance';
import {
  notifyFamilyInviteOnDevice,
  requestDeviceNotificationPermission,
} from '../utils/deviceNotifications';
import { extractApiErrorMessage, getApiErrorStatus } from '../utils/errorHandler';
import { formatMonthLabel, getCurrentMonthKey } from '../utils/formatters';

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
  investments: 0,
  foodAllowance: 0,
  foodAllowanceTotal: 0,
  foodAllowanceUsed: 0,
  ownBalance: 0,
  ownEmergencyFund: 0,
  ownInvestments: 0,
  ownFoodAllowance: 0,
  ownFoodAllowanceTotal: 0,
  ownFoodAllowanceUsed: 0,
  memberBreakdown: [],
};

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [panelScope, setPanelScope] = useState<PanelScope>('individual');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(getCurrentMonthKey());
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  const [balance, setBalance] = useState<BalanceData>(INITIAL_BALANCE);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('todas');

  const [familyStatus, setFamilyStatus] = useState<FamilyStatusData | null>(null);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [activeInviteModal, setActiveInviteModal] = useState<PendingFamilyInvite | null>(null);
  const dismissedInviteIdsRef = useRef<Set<string>>(new Set());

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [payingExpense, setPayingExpense] = useState<ExpenseItem | null>(null);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState<string>('');
  const [payingInvoice, setPayingInvoice] = useState<CreditCardInvoiceGroup | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{
    id: string;
    type: 'expense' | 'income';
  } | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openInstallments, setOpenInstallments] = useState<string[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [allocationModal, setAllocationModal] = useState<'emergency' | 'investment' | 'food' | null>(
    null,
  );
  const [allocationInput, setAllocationInput] = useState('');
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
        const [balanceRes, expensesRes, incomesRes, chartsRes] = await Promise.all([
          api.get<BalanceData>('/balance', { params: { scope: scopeToUse } }),
          api.get<ExpenseItem[]>('/expenses', { params: { scope: scopeToUse } }),
          api.get<IncomeItem[]>('/income', { params: { scope: scopeToUse } }),
          api.get<ChartDataResponse>('/balance/charts', {
            params: { scope: scopeToUse, month: monthToUse },
          }),
        ]);
        setBalance(balanceRes.data);
        setExpenses(expensesRes.data);
        setIncomes(incomesRes.data);
        setChartData(chartsRes.data);
      } catch (error: unknown) {
        const status = getApiErrorStatus(error);
        if (status === 401) {
          logout();
          return;
        }
        if (scopeToUse === 'family' && status === 403) {
          setPanelScope('individual');
          toast.warning('Acesso ao Painel Família não autorizado. Voltando ao Painel Individual.');
          return;
        }
        toast.error(extractApiErrorMessage(error, 'Erro ao carregar dados do painel financeiro'));
      }
    },
    [panelScope, chartMonth, logout],
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

  const handleScopeChange = (nextScope: PanelScope) => {
    setPanelScope(nextScope);
    setSelectedMemberFilter('all');
  };

  const handleDelete = async () => {
    if (!deleteConfig) return;
    try {
      setIsDeleteLoading(true);
      const endpoint = deleteConfig.type === 'expense' ? '/expenses' : '/income';
      await api.delete(`${endpoint}/${deleteConfig.id}`);
      toast.success('Registro removido com sucesso');
      setDeleteConfig(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, 'Erro ao remover registro'));
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleOpenAllocation = (variant: 'emergency' | 'investment' | 'food') => {
    const currentVal =
      variant === 'food'
        ? balance.ownFoodAllowanceTotal ?? balance.foodAllowanceTotal ?? 0
        : variant === 'emergency'
          ? balance.ownEmergencyFund ?? balance.emergencyFund ?? 0
          : balance.ownInvestments ?? balance.investments ?? 0;
    setAllocationInput(String(currentVal));
    setAllocationModal(variant);
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationModal) return;

    const amount = parseFloat(allocationInput);
    if (isNaN(amount) || amount < 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const isEmergency = allocationModal === 'emergency';
    const isFood = allocationModal === 'food';

    if (!isFood) {
      const maxLimit =
        Number(balance.ownBalance || 0) +
        Number(isEmergency ? balance.ownEmergencyFund || 0 : balance.ownInvestments || 0);

      if (amount > maxLimit + 0.001) {
        toast.error(
          isEmergency
            ? 'A reserva não pode exceder o seu saldo disponível'
            : 'O valor investido não pode exceder o seu saldo disponível',
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
      await api.post(endpoint, { amount });
      toast.success(
        isFood
          ? 'Vale Alimentação / Refeição atualizado!'
          : isEmergency
            ? 'Reserva de emergência atualizada!'
            : 'Investimentos atualizados!',
      );
      setAllocationModal(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(
        extractApiErrorMessage(
          error,
          isFood
            ? 'Erro ao atualizar Vale Alimentação / Refeição'
            : isEmergency
              ? 'Erro ao atualizar reserva'
              : 'Erro ao atualizar investimentos',
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
        const fullMonth = dateObj.toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        });
        const shortMonth = dateObj
          .toLocaleDateString('pt-BR', { month: 'short' })
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

  const allocationMaxLimit = allocationModal
    ? Number(balance.ownBalance || 0) +
      Number(
        allocationModal === 'emergency'
          ? balance.ownEmergencyFund || 0
          : balance.ownInvestments || 0,
      )
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        userId={user?.id}
        userName={user?.name}
        userCpf={user?.cpf}
        userInitials={userInitials}
        panelScope={panelScope}
        familyStatus={familyStatus}
        pendingInvitesCount={pendingInvites.length}
        onChangeScope={handleScopeChange}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onOpenProfileModal={() => setIsUserModalOpen(true)}
        onRequestLogout={() => setShowLogoutConfirm(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-grow w-full space-y-6 sm:space-y-8">
        {pendingInvites.length > 0 && (
          <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 shadow-executive-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                {React.createElement(FaBell as any, { className: 'text-sm' })}
              </span>
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">Convite pendente para o Modo Família!</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  <strong>{pendingInvites[0].inviterName}</strong> (CPF{' '}
                  {pendingInvites[0].inviterMaskedCpf}) quer unificar o painel financeiro com você.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveInviteModal(pendingInvites[0])}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors self-start sm:self-center whitespace-nowrap"
            >
              Analisar convite
            </button>
          </div>
        )}

        {familyStatus?.inFamily && (
          <div className="md:hidden flex items-center rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => handleScopeChange('individual')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                panelScope === 'individual' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              {React.createElement(FaUser as any, { className: 'text-[10px]' })}
              Painel Individual
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('family')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                panelScope === 'family' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              {React.createElement(FaUsers as any, { className: 'text-[11px]' })}
              Painel Família ({familyStatus.members?.length || 2})
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {currentPeriodLabel} {isFamilyMode ? '· Modo Família Ativo' : ''}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-0.5">
                {isFamilyMode ? 'Painel Consolidado da Família' : 'Visão Geral Financeira'}
              </h1>
            </div>

            <div className="inline-flex items-center rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview');
                  setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'overview' && !categoryDetailState.isOpen
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {React.createElement(FaThLarge as any, { className: 'text-[11px]' })}
                Painel do Mês
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  setCategoryDetailState((prev) => ({ ...prev, isOpen: false }));
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history' && !categoryDetailState.isOpen
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {React.createElement(FaHistory as any, { className: 'text-[11px]' })}
                Histórico
              </button>
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
              {React.createElement(FaPlus as any, { className: 'text-xs text-emerald-600' })}
              <span>Nova Receita</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsExpenseModalOpen(true);
              }}
              className="exec-btn-primary w-full sm:w-44 h-11 gap-2 whitespace-nowrap justify-center"
            >
              {React.createElement(FaPlus as any, { className: 'text-xs' })}
              <span>Nova Despesa</span>
            </button>
          </div>
        </div>

        {isFamilyMode && (
          <FamilyMembersStrip
            members={balance.memberBreakdown || []}
            selectedMemberId={selectedMemberFilter}
            onSelectMember={setSelectedMemberFilter}
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
              onOpenInvestmentModal={() => handleOpenAllocation('investment')}
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
          </>
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-5 px-4 text-center mt-auto">
        <p className="text-xs text-slate-400">
          Controle Financeiro &copy; {new Date().getFullYear()} — Gestão Patrimonial
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
        onClose={() => setPayingExpense(null)}
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
        title="Confirmar exclusão"
        message="Esta ação é irreversível. O lançamento será removido permanentemente do seu histórico."
        confirmText="Excluir registro"
        isLoading={isDeleteLoading}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Encerrar sessão"
        message="Deseja sair do painel financeiro? Você precisará fazer login novamente para acessar."
        confirmText="Sair"
      />

      {user && (
        <UserEditModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          userData={{
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
          }}
          onSuccess={async () => {
            try {
              const res = await api.get('/users/me');
              updateUser(res.data);
              fetchFamilyStatus();
            } catch (error: unknown) {
              toast.error(extractApiErrorMessage(error, 'Sessão expirada. Faça login novamente.'));
              logout();
            }
          }}
        />
      )}

      <AllocationModal
        isOpen={allocationModal !== null}
        variant={allocationModal || 'emergency'}
        value={allocationInput}
        maxLimit={allocationMaxLimit}
        usedAmount={balance.ownFoodAllowanceUsed ?? balance.foodAllowanceUsed ?? 0}
        loading={isAllocationLoading}
        onChangeValue={setAllocationInput}
        onClose={() => setAllocationModal(null)}
        onSubmit={handleAllocationSubmit}
      />
    </div>
  );
};

export default Dashboard;
