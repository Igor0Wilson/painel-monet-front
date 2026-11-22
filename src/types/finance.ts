export type ExpenseFilter = 'todas' | 'pendente' | 'em_atraso' | 'pago';
export type ActiveTab = 'overview' | 'history';
export type PanelScope = 'individual' | 'family';
export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'va' | 'vr';
export type InvestmentSource = 'external' | 'balance';

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
  memberBreakdown: MemberBreakdown[];
}

export interface ExpenseItem {
  id: string;
  name: string;
  accountTypeId: string;
  accountType?: { id: string; name: string } | null;
  value: number;
  dueDate: string;
  isRecurring: boolean;
  isInstallment: boolean;
  installmentCount?: number | null;
  installmentNumber?: number | null;
  parentExpenseId?: string | null;
  isPaid: boolean;
  isCreditCard?: boolean;
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  status: 'pago' | 'em_atraso' | 'pendente';
  ownerId?: string;
  ownerName?: string;
  isOwn?: boolean;
}

export interface IncomeItem {
  id: string;
  name: string;
  value: number;
  isRecurring: boolean;
  incomeDate: string;
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
