export type FinancialTransaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'overdue' | 'canceled' | 'completed';
  dueDate: string;
  paidAt?: string;
  profileId?: string;
  providerId?: string;
  relatedContractId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Scholarship = {
  id: string;
  name: string;
  description?: string;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileScholarship = {
  id: string;
  profileId: string;
  scholarshipId: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
};

// Novas tabelas financeiras
export type Invoice = {
  id: string;
  profileId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  status: 'draft' | 'issued' | 'paid' | 'canceled';
  description: string;
  notes?: string;
  recipientName: string;
  recipientTaxId: string;
  recipientAddress: string;
  serviceDescription: string;
  xmlData?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type FinancialDeclaration = {
  id: string;
  profileId: string;
  declarationType: 'nothing_owed' | 'enrollment_certificate' | 'payment_history';
  title: string;
  content: string;
  referencePeriodStart?: string;
  referencePeriodEnd?: string;
  authCode: string;
  status: 'active' | 'expired' | 'revoked';
  validUntil: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentReminder = {
  id: string;
  transactionId: string;
  reminderType: 'before_due' | 'after_due' | 'final_notice';
  scheduledDate: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  messageContent: string;
  contactMethod: 'email' | 'sms' | 'whatsapp';
  createdAt: string;
  updatedAt: string;
};

export type FinancialBatch = {
  id: string;
  batchType: 'bank_slips' | 'invoices' | 'reminders' | 'payments';
  description: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdBy: string;
  processedAt?: string;
  errorLog?: string;
  createdAt: string;
  updatedAt: string;
};

// Tipos para boletos bancários aprimorados
export type BankSlip = {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  barcode?: string;
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  batchId?: string;
  emailSent: boolean;
  emailSentAt?: string;
  paymentMethod?: 'bank_slip' | 'pix' | 'credit_card' | 'debit_card' | 'cash';
  pixKey?: string;
  qrCodeUrl?: string;
  lateFee: number;
  interestRate: number;
  discountAmount: number;
  finalAmount: number;
  bankIntegrationId?: string;
  externalId?: string;
  notes?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
};

// Tipos para integração bancária
export type BankIntegration = {
  id: string;
  bankName: string;
  integrationType: 'api' | 'webhook' | 'file';
  apiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  configJson?: Record<string, any>;
  isActive: boolean;
  lastSync?: string;
  lastError?: string;
  syncFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  createdAt: string;
  updatedAt: string;
};

// Tipos para cobrança automática
export type AutomaticBillingConfig = {
  id: string;
  profileId: string;
  enableReminders: boolean;
  daysBefore: number;
  daysAfter: number;
  maxReminders: number;
  preferredContact: 'email' | 'sms' | 'whatsapp';
  customMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingMessageTemplate = {
  id: string;
  templateType: 'before_due' | 'after_due' | 'payment_confirmation';
  contactMethod: 'email' | 'sms';
  subject?: string;
  messageContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillingNotificationLog = {
  id: string;
  transactionId?: string;
  profileId: string;
  notificationType: 'email' | 'sms' | 'whatsapp';
  recipientContact: string;
  messageContent: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
};

// Tipos para relatórios financeiros
export type FinancialBalanceReport = {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactions: {
    origin: string;
    income: number;
    expenses: number;
    balance: number;
  }[];
};

export type FinancialSummaryReport = {
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  averageTransactionValue: number;
  transactionCount: number;
};

export type DebtSettlementReport = {
  studentId: string;
  studentName: string;
  totalDebt: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  debtStatus: 'current' | 'overdue' | 'settled';
  lastPaymentDate?: string;
};

export type ClassDelinquencyReport = {
  classId: string;
  className: string;
  totalStudents: number;
  delinquentStudents: number;
  overdueAmount: number;
  delinquencyRate: number;
  delinquencyLevel: 'low' | 'medium' | 'high' | 'critical';
};

export type FinancialDashboardSummary = {
  currentMonthRevenue: number;
  currentMonthExpenses: number;
  pendingReceivables: number;
  overdueAmount: number;
  activeStudents: number;
  delinquentStudents: number;
  averageDelinquencyRate: number;
};

// Tipos para operações em lote
export type BulkStudentFinancialData = {
  studentId: string;
  bankAccount?: string;
  taxId?: string;
  billingAddress?: string;
};

export type BulkScholarshipData = {
  studentId: string;
  scholarshipId: string;
  startDate: string;
  endDate?: string;
};

export type BulkOperationResult = {
  studentId: string;
  scholarshipId?: string;
  status: 'success' | 'error';
  errorMessage?: string;
};
