import { supabase } from '@/integrations/supabase/client';
import { 
  FinancialTransaction, 
  Scholarship, 
  ProfileScholarship,
  Invoice,
  FinancialDeclaration,
  PaymentReminder,
  FinancialBatch,
  BankSlip,
  BankIntegration,
  AutomaticBillingConfig,
  BillingMessageTemplate,
  BillingNotificationLog,
  FinancialBalanceReport,
  FinancialSummaryReport,
  DebtSettlementReport,
  ClassDelinquencyReport,
  FinancialDashboardSummary,
  BulkStudentFinancialData,
  BulkScholarshipData,
  BulkOperationResult
} from '@/types/financial';

// Type for creating a new transaction, omitting read-only fields
export type NewFinancialTransaction = Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'>;

// Type for updating a transaction
export type UpdateFinancialTransaction = Partial<NewFinancialTransaction>;

// Types for new entities
export type NewInvoice = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
export type NewBankSlip = Omit<BankSlip, 'id' | 'createdAt' | 'updatedAt'>;
export type NewFinancialDeclaration = Omit<FinancialDeclaration, 'id' | 'createdAt' | 'updatedAt'>;


const financialService = {
  // == FINANCIAL TRANSACTIONS ==

  async getFinancialTransactions(): Promise<FinancialTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('due_date', { ascending: false });

      if (error) throw error;

      return data.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        status: t.status,
        dueDate: t.due_date,
        paidAt: t.paid_at,
        profileId: t.profile_id,
        providerId: t.provider_id,
        relatedContractId: t.related_contract_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      throw new Error('Failed to fetch financial transactions.');
    }
  },

  async createFinancialTransaction(transaction: NewFinancialTransaction): Promise<FinancialTransaction> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          due_date: transaction.dueDate,
          paid_at: transaction.paidAt,
          profile_id: transaction.profileId,
          provider_id: transaction.providerId,
          related_contract_id: transaction.relatedContractId,
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: data.status,
        dueDate: data.due_date,
        paidAt: data.paid_at,
        profileId: data.profile_id,
        providerId: data.provider_id,
        relatedContractId: data.related_contract_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating financial transaction:', error);
      throw new Error('Failed to create financial transaction.');
    }
  },

  // == BULK OPERATIONS ==

  async bulkRegisterStudentFinancialData(studentsData: BulkStudentFinancialData[]): Promise<BulkOperationResult[]> {
    try {
      const { data, error } = await supabase.rpc('bulk_register_student_financial_data', {
        p_student_data: studentsData
      });

      if (error) throw error;

      return data.map((result: any) => ({
        studentId: result.student_id,
        status: result.status,
        errorMessage: result.error_message
      }));
    } catch (error) {
      console.error('Error in bulk student financial data registration:', error);
      throw new Error('Failed to register student financial data in bulk.');
    }
  },

  async bulkRegisterScholarshipStudents(scholarshipData: BulkScholarshipData[]): Promise<BulkOperationResult[]> {
    try {
      const { data, error } = await supabase.rpc('bulk_register_scholarship_students', {
        p_scholarship_data: scholarshipData
      });

      if (error) throw error;

      return data.map((result: any) => ({
        studentId: result.student_id,
        scholarshipId: result.scholarship_id,
        status: result.status,
        errorMessage: result.error_message
      }));
    } catch (error) {
      console.error('Error in bulk scholarship registration:', error);
      throw new Error('Failed to register scholarships in bulk.');
    }
  },

  // == BANK SLIPS ==

  async getBankSlips(): Promise<BankSlip[]> {
    try {
      const { data, error } = await supabase
        .from('bank_slips')
        .select('*')
        .order('due_date', { ascending: false });

      if (error) throw error;

      return data.map(slip => ({
        id: slip.id,
        studentId: slip.student_id,
        amount: slip.amount,
        dueDate: slip.due_date,
        barcode: slip.barcode,
        status: slip.status,
        batchId: slip.batch_id,
        emailSent: slip.email_sent,
        emailSentAt: slip.email_sent_at,
        paymentMethod: slip.payment_method,
        pixKey: slip.pix_key,
        qrCodeUrl: slip.qr_code_url,
        lateFee: slip.late_fee || 0,
        interestRate: slip.interest_rate || 0,
        discountAmount: slip.discount_amount || 0,
        finalAmount: slip.final_amount,
        bankIntegrationId: slip.bank_integration_id,
        externalId: slip.external_id,
        notes: slip.notes,
        paymentDate: slip.payment_date,
        createdAt: slip.created_at,
        updatedAt: slip.updated_at
      }));
    } catch (error) {
      console.error('Error fetching bank slips:', error);
      throw new Error('Failed to fetch bank slips.');
    }
  },

  async generateBankSlipsBatch(studentIds: string[], amount: number, dueDate: string, description: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_bank_slips_batch', {
        p_student_ids: studentIds,
        p_amount: amount,
        p_due_date: dueDate,
        p_description: description
      });

      if (error) throw error;

      return data; // Returns batch_id
    } catch (error) {
      console.error('Error generating bank slips batch:', error);
      throw new Error('Failed to generate bank slips batch.');
    }
  },

  async sendBankSlipsBatch(batchId: string, emailTemplate: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('send_bank_slips_batch', {
        p_batch_id: batchId,
        p_email_template: emailTemplate
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending bank slips batch:', error);
      throw new Error('Failed to send bank slips batch.');
    }
  },

  async processBankSlipPayment(bankSlipId: string, paymentAmount: number, paymentDate?: string): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      const { data, error } = await supabase.rpc('process_bank_slip_payment', {
        p_bank_slip_id: bankSlipId,
        p_payment_amount: paymentAmount,
        p_payment_date: paymentDate || new Date().toISOString()
      });

      if (error) throw error;

      return {
        success: data[0].success,
        message: data[0].message,
        transactionId: data[0].transaction_id
      };
    } catch (error) {
      console.error('Error processing bank slip payment:', error);
      throw new Error('Failed to process bank slip payment.');
    }
  },

  // == FINANCIAL REPORTS ==

  async getFinancialBalance(profileId?: string): Promise<FinancialBalanceReport> {
    try {
      // Usar período do mês atual por padrão
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_financial_balance_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_origin_destination: null
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          period: `${startDate} - ${endDate}`,
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          transactions: []
        };
      }

      // Somar todos os resultados
      const totalIncome = data.reduce((sum, row) => sum + (row.total_income || 0), 0);
      const totalExpenses = data.reduce((sum, row) => sum + (row.total_expenses || 0), 0);
      const netBalance = data.reduce((sum, row) => sum + (row.net_balance || 0), 0);

      // Mapear transações para o formato esperado
      const transactions = data.map((row, index) => ({
        id: `balance-${index}`,
        date: endDate,
        description: row.origin_destination || 'Transação',
        income: row.total_income || 0,
        expenses: row.total_expenses || 0,
        balance: row.net_balance || 0
      }));

      return {
        period: `${startDate} - ${endDate}`,
        totalIncome,
        totalExpenses,
        netBalance,
        transactions
      };
    } catch (error) {
      console.error('Error fetching financial balance:', error);
      throw new Error('Failed to fetch financial balance.');
    }
  },

  async getFinancialSummary(startDate: string, endDate: string): Promise<FinancialSummaryReport> {
    try {
      const { data, error } = await supabase.rpc('get_financial_summary_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_period_type: 'monthly'
      });

      if (error) throw error;

      // Se não há dados, retorna valores zerados
      if (!data || data.length === 0) {
        return {
          period: `${startDate} - ${endDate}`,
          periodType: 'monthly',
          totalIncome: 0,
          totalExpenses: 0,
          netResult: 0,
          averageTransactionValue: 0,
          transactionCount: 0
        };
      }

      // Soma todos os períodos retornados
      const totalIncome = data.reduce((sum, row) => sum + (row.total_income || 0), 0);
      const totalExpenses = data.reduce((sum, row) => sum + (row.total_expenses || 0), 0);
      const netResult = data.reduce((sum, row) => sum + (row.net_result || 0), 0);
      const transactionCount = data.reduce((sum, row) => sum + (row.income_count || 0) + (row.expense_count || 0), 0);
      const averageTransactionValue = transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

      return {
        period: `${startDate} - ${endDate}`,
        periodType: 'monthly',
        totalIncome,
        totalExpenses,
        netResult,
        averageTransactionValue,
        transactionCount
      };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw new Error('Failed to fetch financial summary.');
    }
  },

  async getDebtSettlementReport(profileId: string): Promise<DebtSettlementReport> {
    try {
      const { data, error } = await supabase.rpc('get_debt_settlement_report', {
        p_student_id: profileId,
        p_start_date: null,
        p_end_date: null
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          studentId: profileId,
          studentName: '',
          totalDebt: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          debtStatus: 'current',
          lastPaymentDate: null
        };
      }

      return {
        studentId: data[0].student_id || profileId,
        studentName: data[0].student_name || '',
        totalDebt: data[0].total_debt || 0,
        paidAmount: data[0].paid_amount || 0,
        pendingAmount: data[0].pending_amount || 0,
        overdueAmount: data[0].overdue_amount || 0,
        debtStatus: data[0].debt_status || 'current',
        lastPaymentDate: data[0].last_payment_date
      };
    } catch (error) {
      console.error('Error fetching debt settlement report:', error);
      throw new Error('Failed to fetch debt settlement report.');
    }
  },

  async getClassDelinquencyReport(classId: string): Promise<ClassDelinquencyReport> {
    try {
      const { data, error } = await supabase.rpc('get_class_delinquency_report', {
        p_course_id: classId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          classId,
          className: '',
          totalStudents: 0,
          delinquentStudents: 0,
          overdueAmount: 0,
          delinquencyRate: 0,
          delinquencyLevel: 'low'
        };
      }

      return {
        classId: data[0].class_id || classId,
        className: data[0].class_name || '',
        totalStudents: data[0].total_students || 0,
        delinquentStudents: data[0].delinquent_students || 0,
        overdueAmount: data[0].total_overdue_amount || 0,
        delinquencyRate: data[0].delinquency_rate || 0,
        delinquencyLevel: data[0].delinquency_level || 'low'
      };
    } catch (error) {
      console.error('Error fetching class delinquency report:', error);
      throw new Error('Failed to fetch class delinquency report.');
    }
  },

  async getFinancialDashboard(): Promise<FinancialDashboardSummary> {
    try {
      const { data, error } = await supabase
        .rpc('get_financial_dashboard');

      if (error) throw error;

      // Processar os dados retornados da função
      const metrics = data || [];
      const result: any = {};
      
      metrics.forEach((metric: any) => {
        switch (metric.metric_name) {
          case 'Receitas do Mês':
            result.monthlyRevenue = metric.value;
            break;
          case 'Despesas do Mês':
            result.monthlyExpenses = metric.value;
            break;
          case 'Valores em Atraso':
            result.totalOverdue = metric.value;
            break;
          case 'Estudantes Inadimplentes':
            result.delinquentStudents = metric.value;
            break;
        }
      });

      return {
        currentMonthRevenue: result.monthlyRevenue || 0,
        currentMonthExpenses: result.monthlyExpenses || 0,
        pendingReceivables: result.pendingReceivables || 0,
        overdueAmount: result.totalOverdue || 0,
        activeStudents: result.activeStudents || 0,
        delinquentStudents: result.delinquentStudents || 0,
        averageDelinquencyRate: result.monthlyRevenue > 0 ? ((result.totalOverdue || 0) / result.monthlyRevenue * 100) : 0
      };
    } catch (error) {
      console.error('Error fetching financial dashboard:', error);
      throw new Error('Failed to fetch financial dashboard.');
    }
  },

  // == INVOICES ==

  async createInvoice(invoice: NewInvoice): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          profile_id: invoice.profileId,
          amount: invoice.amount,
          description: invoice.description,
          due_date: invoice.dueDate,
          status: invoice.status || 'pending',
          invoice_number: invoice.invoiceNumber,
          tax_amount: invoice.taxAmount,
          discount_amount: invoice.discountAmount,
          notes: invoice.notes
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        profileId: data.profile_id,
        amount: data.amount,
        description: data.description,
        dueDate: data.due_date,
        status: data.status,
        invoiceNumber: data.invoice_number,
        taxAmount: data.tax_amount,
        discountAmount: data.discount_amount,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw new Error('Failed to create invoice.');
    }
  },

  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(invoice => ({
        id: invoice.id,
        profileId: invoice.profile_id,
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date || invoice.created_at,
        dueDate: invoice.due_date,
        amount: invoice.amount,
        taxAmount: invoice.tax_amount,
        discountAmount: invoice.discount_amount,
        totalAmount: invoice.total_amount || invoice.amount,
        status: invoice.status,
        description: invoice.description,
        notes: invoice.notes,
        recipientName: invoice.recipient_name || '',
        recipientTaxId: invoice.recipient_tax_id || '',
        recipientAddress: invoice.recipient_address || '',
        serviceDescription: invoice.service_description || invoice.description,
        xmlData: invoice.xml_data,
        pdfUrl: invoice.pdf_url,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch invoices.');
    }
  },

  // == FINANCIAL DECLARATIONS ==

  async generateNothingOwedDeclaration(profileId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; declarationId?: string; authCode?: string; message: string }> {
    try {
      const { data, error } = await supabase.rpc('generate_nothing_owed_declaration', {
        p_profile_id: profileId,
        p_reference_period_start: startDate || null,
        p_reference_period_end: endDate || null
      });

      if (error) throw error;

      return {
        success: data[0].success,
        declarationId: data[0].declaration_id,
        authCode: data[0].auth_code,
        message: data[0].message
      };
    } catch (error) {
      console.error('Error generating nothing owed declaration:', error);
      throw new Error('Failed to generate nothing owed declaration.');
    }
  },

  async getFinancialDeclarations(profileId?: string): Promise<FinancialDeclaration[]> {
    try {
      let query = supabase
        .from('financial_declarations')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(declaration => ({
        id: declaration.id,
        profileId: declaration.profile_id,
        declarationType: declaration.declaration_type,
        title: declaration.title || 'Declaração Financeira',
        content: declaration.content || '',
        referencePeriodStart: declaration.reference_period_start,
        referencePeriodEnd: declaration.reference_period_end,
        authCode: declaration.authentication_code || declaration.auth_code,
        status: declaration.status,
        validUntil: declaration.valid_until,
        createdAt: declaration.created_at,
        updatedAt: declaration.updated_at
      }));
    } catch (error) {
      console.error('Error fetching financial declarations:', error);
      throw new Error('Failed to fetch financial declarations.');
    }
  },

  // == AUTOMATIC BILLING ==

  async setupAutomaticBilling(profileId: string, config: Partial<AutomaticBillingConfig>): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('setup_automatic_billing', {
        p_profile_id: profileId,
        p_days_before_due: config.daysBefore,
        p_days_after_due: config.daysAfter,
        p_enable_reminders: config.enableReminders,
        p_preferred_contact: config.preferredContact,
        p_max_reminders: config.maxReminders,
        p_custom_message: config.customMessage
      });

      if (error) throw error;

      return {
        success: data[0].success,
        message: data[0].message
      };
    } catch (error) {
      console.error('Error setting up automatic billing:', error);
      throw new Error('Failed to setup automatic billing.');
    }
  },

  async processAutomaticBilling(): Promise<{ success: boolean; processedCount: number; message: string }> {
    try {
      const { data, error } = await supabase.rpc('process_automatic_billing');

      if (error) throw error;

      return {
        success: data[0].success,
        processedCount: data[0].processed_count,
        message: data[0].message
      };
    } catch (error) {
      console.error('Error processing automatic billing:', error);
      throw new Error('Failed to process automatic billing.');
    }
  },

  // == UTILITIES ==

  async calculateLateFees(originalAmount: number, dueDate: string, interestRate?: number, lateFeeRate?: number): Promise<{ lateFee: number; interest: number; totalAmount: number }> {
    try {
      const { data, error } = await supabase.rpc('calculate_late_fees', {
        p_original_amount: originalAmount,
        p_due_date: dueDate,
        p_interest_rate: interestRate || 0.02,
        p_late_fee_rate: lateFeeRate || 0.05
      });

      if (error) throw error;

      return {
        lateFee: data[0].late_fee,
        interest: data[0].interest,
        totalAmount: data[0].total_amount
      };
    } catch (error) {
      console.error('Error calculating late fees:', error);
      throw new Error('Failed to calculate late fees.');
    }
  },

  async backupFinancialData(startDate: string, endDate: string): Promise<{ success: boolean; backupData?: any; message: string }> {
    try {
      const { data, error } = await supabase.rpc('backup_financial_data', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      return {
        success: data[0].success,
        backupData: data[0].backup_data,
        message: data[0].message
      };
    } catch (error) {
      console.error('Error backing up financial data:', error);
      throw new Error('Failed to backup financial data.');
    }
  },

  async updateFinancialTransaction(id: string, updates: UpdateFinancialTransaction): Promise<FinancialTransaction> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .update({
          description: updates.description,
          amount: updates.amount,
          type: updates.type,
          status: updates.status,
          due_date: updates.dueDate,
          paid_at: updates.paidAt,
          profile_id: updates.profileId,
          provider_id: updates.providerId,
          related_contract_id: updates.relatedContractId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: data.status,
        dueDate: data.due_date,
        paidAt: data.paid_at,
        profileId: data.profile_id,
        providerId: data.provider_id,
        relatedContractId: data.related_contract_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating financial transaction:', error);
      throw new Error('Failed to update financial transaction.');
    }
  },

  async deleteFinancialTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting financial transaction:', error);
      throw new Error('Failed to delete financial transaction.');
    }
  },

  // == SCHOLARSHIPS ==

  async getScholarships(): Promise<Scholarship[]> {
    try {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return data.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        discountPercentage: s.discount_percentage,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      throw new Error('Failed to fetch scholarships.');
    }
  },

  async createScholarship(scholarshipData: Omit<Scholarship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scholarship> {
    try {
      const { data, error } = await supabase
        .from('scholarships')
        .insert({
          name: scholarshipData.name,
          description: scholarshipData.description,
          discount_percentage: scholarshipData.discountPercentage,
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        discountPercentage: data.discount_percentage,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating scholarship:', error);
      throw new Error('Failed to create scholarship.');
    }
  },

  async deleteScholarship(id: string): Promise<void> {
    try {
      await supabase.from('profile_scholarships').delete().eq('scholarship_id', id);
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting scholarship:', error);
      throw new Error('Failed to delete scholarship.');
    }
  },

  // == PROFILE SCHOLARSHIPS ==

  async getProfileScholarships(): Promise<(ProfileScholarship & { profiles: { name: string }, scholarships: { name: string }})[]> {
    try {
        const { data, error } = await supabase
            .from('profile_scholarships')
            .select('*, profiles!profile_id(name), scholarships!scholarship_id(name)');

        if (error) throw error;

        return data.map(ps => ({
            id: ps.id,
            profileId: ps.profile_id,
            scholarshipId: ps.scholarship_id,
            startDate: ps.start_date,
            endDate: ps.end_date,
            createdAt: ps.created_at,
            profiles: ps.profiles,
            scholarships: ps.scholarships,
        }));
    } catch (error) {
        console.error('Error fetching profile scholarships:', error);
        throw new Error('Failed to fetch profile scholarships.');
    }
  },

  async assignScholarshipToProfile(assignment: Omit<ProfileScholarship, 'id' | 'createdAt'>): Promise<ProfileScholarship> {
    try {
        const { data, error } = await supabase
            .from('profile_scholarships')
            .insert({
                profile_id: assignment.profileId,
                scholarship_id: assignment.scholarshipId,
                start_date: assignment.startDate,
                end_date: assignment.endDate,
            })
            .select('*')
            .single();

        if (error) throw error;

        return {
            id: data.id,
            profileId: data.profile_id,
            scholarshipId: data.scholarship_id,
            startDate: data.start_date,
            endDate: data.end_date,
            createdAt: data.created_at,
        };
    } catch (error) {
        console.error('Error assigning scholarship:', error);
        throw new Error('Failed to assign scholarship.');
    }
  },

  async removeScholarshipFromProfile(assignmentId: string): Promise<void> {
      try {
          const { error } = await supabase
              .from('profile_scholarships')
              .delete()
              .eq('id', assignmentId);

          if (error) throw error;
      } catch (error) {
          console.error('Error removing scholarship assignment:', error);
          throw new Error('Failed to remove scholarship assignment.');
      }
  },

  // == BATCH OPERATIONS ==

  async createBatchTransactions(transactions: NewFinancialTransaction[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert(transactions.map(t => ({
            description: t.description,
            amount: t.amount,
            type: t.type,
            status: t.status,
            due_date: t.dueDate,
            paid_at: t.paidAt,
            profile_id: t.profileId,
            provider_id: t.providerId,
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error creating batch transactions:', error);
      throw new Error('Failed to create batch transactions.');
    }
  },

  async assignBatchScholarships(assignments: Omit<ProfileScholarship, 'id' | 'createdAt'>[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('profile_scholarships')
        .insert(assignments.map(a => ({
          profile_id: a.profileId,
          scholarship_id: a.scholarshipId,
          start_date: a.startDate,
          end_date: a.endDate,
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning batch scholarships:', error);
      throw new Error('Failed to assign batch scholarships.');
    }
  }
};

export default financialService;
