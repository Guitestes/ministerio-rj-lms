-- Atualizações para Módulo de Gestão Financeira

-- Tabela para dados financeiros de alunos e professores
CREATE TABLE financial_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    user_type VARCHAR(50) CHECK (user_type IN ('student', 'teacher')),
    bank_account VARCHAR(255),
    tax_id VARCHAR(50),
    billing_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para emissão de boletos bancários
CREATE TABLE bank_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    barcode VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar coluna para controle de inadimplência em matrículas
ALTER TABLE enrollments ADD COLUMN overdue_balance DECIMAL(10,2) DEFAULT 0.00;

-- Função para relatórios financeiros (balanço)
CREATE OR REPLACE FUNCTION get_financial_balance(start_date DATE, end_date DATE) RETURNS DECIMAL AS $$
SELECT SUM(amount) FROM bank_slips WHERE due_date BETWEEN $1 AND $2 AND status = 'paid';
$$ LANGUAGE SQL;

-- Função para previsão de receitas/despesas
CREATE OR REPLACE FUNCTION get_revenue_forecast(month INTEGER, year INTEGER) RETURNS DECIMAL AS $$
SELECT SUM(amount) FROM bank_slips WHERE EXTRACT(MONTH FROM due_date) = $1 AND EXTRACT(YEAR FROM due_date) = $2;
$$ LANGUAGE SQL;

-- Tabela para integração com sistemas bancários
CREATE TABLE bank_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name VARCHAR(255),
    api_key VARCHAR(512),
    last_sync TIMESTAMP
);

-- Índice para controle de inadimplência
CREATE INDEX idx_enrollments_overdue ON enrollments(overdue_balance);

-- Política de acesso
CREATE POLICY "Enable read for admins" ON financial_data FOR SELECT USING (is_admin(auth.uid()));