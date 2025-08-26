-- Script para criar políticas de segurança para as tabelas financeiras
-- Row Level Security (RLS) para controle de acesso

-- Habilitar RLS nas novas tabelas
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_batches ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela invoices
-- Admins podem gerenciar todas as notas fiscais
CREATE POLICY "Admins can manage all invoices" ON invoices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Usuários podem ver suas próprias notas fiscais
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Prestadores podem ver notas fiscais relacionadas a eles
CREATE POLICY "Providers can view their invoices" ON invoices
    FOR SELECT
    TO authenticated
    USING (provider_id = auth.uid());

-- Políticas para tabela financial_declarations
-- Admins podem gerenciar todas as declarações
CREATE POLICY "Admins can manage all financial declarations" ON financial_declarations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Usuários podem ver suas próprias declarações
CREATE POLICY "Users can view their own declarations" ON financial_declarations
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());

-- Política para acesso público com código de autenticação
CREATE POLICY "Public access with auth code" ON financial_declarations
    FOR SELECT
    TO anon
    USING (auth_code IS NOT NULL AND status = 'active');

-- Políticas para tabela payment_reminders
-- Admins podem gerenciar todos os lembretes
CREATE POLICY "Admins can manage all payment reminders" ON payment_reminders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Usuários podem ver lembretes de suas próprias transações
CREATE POLICY "Users can view their payment reminders" ON payment_reminders
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM financial_transactions ft
            WHERE ft.id = payment_reminders.transaction_id
            AND ft.profile_id = auth.uid()
        )
    );

-- Políticas para tabela financial_batches
-- Admins podem gerenciar todos os lotes
CREATE POLICY "Admins can manage all financial batches" ON financial_batches
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Usuários podem ver lotes que criaram
CREATE POLICY "Users can view their created batches" ON financial_batches
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Políticas adicionais para bank_slips (melhorias)
-- Usuários podem ver seus próprios boletos
DROP POLICY IF EXISTS "Users can view their own bank slips" ON bank_slips;
CREATE POLICY "Users can view their own bank slips" ON bank_slips
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- Admins podem gerenciar todos os boletos
DROP POLICY IF EXISTS "Admins can manage all bank slips" ON bank_slips;
CREATE POLICY "Admins can manage all bank slips" ON bank_slips
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Função auxiliar para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar para verificar se usuário é financeiro
CREATE OR REPLACE FUNCTION is_financial_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role IN ('admin', 'financial')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants para funções públicas
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_financial_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_bank_slips_batch(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_bank_slips_batch(UUID[], NUMERIC, DATE, TEXT) TO authenticated;