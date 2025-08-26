-- Script para criar tabelas faltantes no módulo financeiro
-- Criado para atender aos requisitos do módulo de gestão financeira

-- Tabela para notas fiscais eletrônicas
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    related_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('service', 'product', 'tuition')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) GENERATED ALWAYS AS (amount + tax_amount) STORED,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'cancelled')),
    xml_content TEXT,
    pdf_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para declarações financeiras (ex: nada consta)
CREATE TABLE IF NOT EXISTS financial_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    declaration_type VARCHAR(30) NOT NULL CHECK (declaration_type IN ('nothing_owed', 'payment_history', 'enrollment_certificate', 'custom')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    reference_period_start DATE,
    reference_period_end DATE,
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    pdf_url TEXT,
    auth_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para lembretes de pagamento automático
CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('sms', 'email', 'both')),
    days_before_due INTEGER NOT NULL CHECK (days_before_due >= 0),
    days_after_due INTEGER DEFAULT 0 CHECK (days_after_due >= 0),
    message_template TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para lotes de operações financeiras
CREATE TABLE IF NOT EXISTS financial_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_type VARCHAR(30) NOT NULL CHECK (batch_type IN ('bank_slips', 'invoices', 'payments', 'scholarships')),
    description TEXT,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_invoices_profile_id ON invoices(profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_financial_declarations_profile_id ON financial_declarations(profile_id);
CREATE INDEX IF NOT EXISTS idx_financial_declarations_type ON financial_declarations(declaration_type);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_transaction_id ON payment_reminders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_financial_batches_type ON financial_batches(batch_type);
CREATE INDEX IF NOT EXISTS idx_financial_batches_status ON financial_batches(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_declarations_updated_at BEFORE UPDATE ON financial_declarations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_reminders_updated_at BEFORE UPDATE ON payment_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();