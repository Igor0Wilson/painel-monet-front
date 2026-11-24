export type ExpenseFilter = 'todas' | 'pendente' | 'em_atraso' | 'pago';
export type ActiveTab =
  | 'overview'
  | 'finances'
  | 'incomes'
  | 'expenses'
  | 'cards'
  | 'food'
  | 'investments'
  | 'history';
export type EditScope = 'only_month' | 'from_month' | 'all' | 'all_installments';
export type PanelScope = 'individual' | 'family';
export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'va' | 'vr';
export type InvestmentSource = 'external' | 'balance';

export interface FoodMonthlyOverride {
  amount?: number;
  creditDate?: string;
  skipped?: boolean;
}

export interface FoodBenefitConfig {
  enabled: boolean;
  amount: number;
  creditDate: string;
  isRecurring: boolean;
  mode: 'fixed' | 'variable';
  recurrenceEndMonth?: string | null;
  monthlyOverrides?: Record<string, FoodMonthlyOverride>;
}

export interface YieldHistoryEntry {
  id: string;
  month: string;
  previousAmount: number;
  newAmount: number;
  delta: number;
  date: string;
  note?: string | null;
}

export interface ExpenseMonthlyOverride {
  value?: number;
  name?: string;
  day?: number;
  accountTypeId?: string;
  skipped?: boolean;
  materializedExpenseId?: string;
}

export interface IncomeMonthlyOverride {
  value?: number;
  name?: string;
  day?: number;
  skipped?: boolean;
}

export interface FamilyMemberPermissions {
  viewBalance: boolean;
  viewIncome: boolean;
  viewExpenses: boolean;
  viewInvestments: boolean;
  viewEmergencyFund: boolean;
  viewFoodAllowance: boolean;
}

export interface MemberPrivacyRule extends FamilyMemberPermissions {
  targetUserId: string;
}

export interface InvestmentItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  principalAmount?: number;
  allocatedPrincipal?: number;
  yieldAmount?: number;
  lastYieldUpdateAt?: string | null;
  yieldHistory?: YieldHistoryEntry[];
  investedDate: string;
  source: InvestmentSource;
  notes?: string | null;
  ownerId?: string;
  ownerName?: string;
  isOwn?: boolean;
}

export interface MemberBreakdown {
  userId: string;
  name: string;
  maskedCpf: string;
  maskedPhone?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isSelf: boolean;
  permissions?: FamilyMemberPermissions;
  balance: number;
  totalIncome: number;
  scheduledIncome: number;
  totalExpenses: number;
  emergencyFund: number;
  allocatedEmergencyFund?: number;
  externalEmergencyFund?: number;
  emergencyFundTotalYield?: number;
  emergencyFundYieldHistory?: YieldHistoryEntry[];
  investments: number;
  allocatedInvestments?: number;
  externalInvestments?: number;
  foodAllowance?: number;
  foodAllowanceTotal?: number;
  foodAllowanceConfigured?: number;
  foodAllowanceScheduled?: number;
  foodAllowanceUsed?: number;
  foodAllowanceDate?: string | null;
  foodAllowanceRecurring?: boolean;
  foodAllowanceNextDate?: string | null;
  vaTotal?: number;
  vaScheduled?: number;
  vaUsed?: number;
  vaRemaining?: number;
  vrTotal?: number;
  vrScheduled?: number;
  vrUsed?: number;
  vrRemaining?: number;
  vaConfig?: FoodBenefitConfig | null;
  vrConfig?: FoodBenefitConfig | null;
}

export interface BalanceData {
  scope?: PanelScope;
  balance: number;
  totalIncome: number;
  scheduledIncome: number;
  totalExpenses: number;
  emergencyFund: number;
  allocatedEmergencyFund?: number;
  externalEmergencyFund?: number;
  investments: number;
  allocatedInvestments?: number;
  externalInvestments?: number;
  foodAllowance?: number;
  foodAllowanceTotal?: number;
  foodAllowanceScheduled?: number;
  foodAllowanceUsed?: number;
  ownBalance: number;
  ownEmergencyFund: number;
  ownAllocatedEmergencyFund?: number;
  ownExternalEmergencyFund?: number;
  ownEmergencyFundTotalYield?: number;
  ownEmergencyFundYieldHistory?: YieldHistoryEntry[];
  ownInvestments: number;
  ownAllocatedInvestments?: number;
  ownExternalInvestments?: number;
  ownFoodAllowance?: number;
  ownFoodAllowanceTotal?: number;
  ownFoodAllowanceConfigured?: number;
  ownFoodAllowanceScheduled?: number;
  ownFoodAllowanceUsed?: number;
  ownFoodAllowanceDate?: string | null;
  ownFoodAllowanceRecurring?: boolean;
  ownFoodAllowanceNextDate?: string | null;
  ownVaTotal?: number;
  ownVaScheduled?: number;
  ownVaUsed?: number;
  ownVaRemaining?: number;
  ownVrTotal?: number;
  ownVrScheduled?: number;
  ownVrUsed?: number;
  ownVrRemaining?: number;
  ownVaConfig?: FoodBenefitConfig | null;
  ownVrConfig?: FoodBenefitConfig | null;
  memberBreakdown: MemberBreakdown[];
}

export interface ExpensePaymentPart {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: PaymentMethod;
  createdAt?: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  accountTypeId: string;
  accountType?: { id: string; name: string } | null;
  value: number;
  paidAmount?: number;
  discountAmount?: number;
  isEarlyPayment?: boolean;
  remainingAmount?: number;
  isPartiallyPaid?: boolean;
  paidAt?: string | null;
  payments?: ExpensePaymentPart[];
  dueDate: string;
  isRecurring: boolean;
  recurrenceEndMonth?: string | null;
  recurrenceGroupId?: string | null;
  recurrenceParentId?: string | null;
  occurrenceMonth?: string | null;
  monthlyOverrides?: Record<string, ExpenseMonthlyOverride>;
  sourceExpenseId?: string | null;
  isInstallment: boolean;
  installmentCount?: number | null;
  installmentNumber?: number | null;
  parentExpenseId?: string | null;
  isPaid: boolean;
  isCreditCard?: boolean;
  paymentMethod?: string | null;
  pixKey?: string | null;
  isAutoDebit?: boolean;
  cardBank?: string | null;
  cardLast4?: string | null;
  receiptUrl?: string | null;
  status: 'pago' | 'em_atraso' | 'pendente';
  ownerId?: string;
  ownerName?: string;
  isOwn?: boolean;
  _occurrenceMonth?: string;
  _projectedFromRecurringId?: string;
  _hasMonthOverride?: boolean;
}

export interface IncomeItem {
  id: string;
  name: string;
  value: number;
  isRecurring: boolean;
  incomeDate: string;
  recurrenceEndMonth?: string | null;
  recurrenceGroupId?: string | null;
  monthlyOverrides?: Record<string, IncomeMonthlyOverride>;
  status?: 'creditado' | 'agendado';
  creditedOccurrences?: number;
  creditedAmount?: number;
  scheduledAmount?: number;
  nextCreditDate?: string | null;
  ownerId?: string;
  ownerName?: string;
  isOwn?: boolean;
}

export interface ChartDataResponse {
  month: string;
  scope: PanelScope;
  expensesByCategory: { name: string; value: number }[];
  monthlyHistory: { month: string; day: number; income: number; expenses: number }[];
  monthSummary: {
    month: string;
    totalIncome: number;
    scheduledIncome: number;
    totalExpenses: number;
    netFlow: number;
  };
  availableMonths: string[];
}

export interface FamilyMemberSummary {
  userId: string;
  name: string;
  maskedCpf: string;
  maskedPhone?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  isSelf: boolean;
  permissionsSharedWithMe?: FamilyMemberPermissions;
}

export interface PendingSentInvite {
  id: string;
  inviteeName: string;
  inviteeMaskedCpf: string;
  status: string;
  createdAt: string;
}

export interface PendingReceivedInvite {
  id: string;
  inviterName: string;
  inviterMaskedCpf: string;
  inviterPhone?: string | null;
  groupName: string;
  createdAt?: string;
}

export interface FamilyStatusData {
  hasCpf: boolean;
  maskedCpf: string | null;
  inFamily: boolean;
  hasGroup: boolean;
  group: { id: string; name: string } | null;
  members: FamilyMemberSummary[];
  myPrivacy?: {
    fullAccessAll: boolean;
    rules: MemberPrivacyRule[];
  };
  pendingReceivedInvites: PendingReceivedInvite[];
  pendingSentInvites: PendingSentInvite[];
}
