-- Script com funções auxiliares e melhorias para o módulo financeiro
-- Funcionalidades complementares e otimizações

-- Função para cadastro em lote de dados financeiros de estudantes
CREATE OR REPLACE FUNCTION bulk_register_student_financial_data(
    p_student_data JSONB -- Array de objetos com student_id, bank_account, tax_id, billing_address
)
RETURNS TABLE(
    student_id UUID,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    student_record JSONB;
    current_student_id UUID;
BEGIN
    FOR student_record IN SELECT * FROM jsonb_array_elements(p_student_data)
    LOOP
        BEGIN
            current_student_id := (student_record->>'student_id')::UUID;
            
            INSERT INTO financial_data (
                user_id, user_type, bank_account, tax_id, billing_address
            ) VALUES (
                current_student_id,
                'student',
                student_record->>'bank_account',
                student_record->>'tax_id',
                student_record->>'billing_address'
            )
            ON CONFLICT (user_id) DO UPDATE SET
                bank_account = EXCLUDED.bank_account,
                tax_id = EXCLUDED.tax_id,
                billing_address = EXCLUDED.billing_address;
            
            RETURN QUERY SELECT current_student_id, 'success'::TEXT, NULL::TEXT;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT current_student_id, 'error'::TEXT, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para cadastro em lote de bolsistas
CREATE OR REPLACE FUNCTION bulk_register_scholarship_students(
    p_scholarship_data JSONB -- Array com student_id, scholarship_id, start_date, end_date
)
RETURNS TABLE(
    student_id UUID,
    scholarship_id UUID,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    scholarship_record JSONB;
    current_student_id UUID;
    current_scholarship_id UUID;
BEGIN
    FOR scholarship_record IN SELECT * FROM jsonb_array_elements(p_scholarship_data)
    LOOP
        BEGIN
            current_student_id := (scholarship_record->>'student_id')::UUID;
            current_scholarship_id := (scholarship_record->>'scholarship_id')::UUID;
            
            INSERT INTO profile_scholarships (
                profile_id, scholarship_id, start_date, end_date
            ) VALUES (
                current_student_id,
                current_scholarship_id,
                (scholarship_record->>'start_date')::TIMESTAMP WITH TIME ZONE,
                (scholarship_record->>'end_date')::TIMESTAMP WITH TIME ZONE
            );
            
            RETURN QUERY SELECT current_student_id, current_scholarship_id, 'success'::TEXT, NULL::TEXT;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT current_student_id, current_scholarship_id, 'error'::TEXT, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar declaração de "nada consta" financeiro
CREATE OR REPLACE FUNCTION generate_nothing_owed_declaration(
    p_profile_id UUID,
    p_reference_period_start DATE DEFAULT NULL,
    p_reference_period_end DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    declaration_id UUID;
    student_name TEXT;
    pending_amount NUMERIC;
    auth_code TEXT;
BEGIN
    -- Buscar nome do estudante
    SELECT name INTO student_name
    FROM profiles
    WHERE id = p_profile_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estudante não encontrado';
    END IF;
    
    -- Verificar se há débitos pendentes
    SELECT COALESCE(SUM(amount), 0) INTO pending_amount
    FROM financial_transactions
    WHERE profile_id = p_profile_id
    AND status = 'pending'
    AND (p_reference_period_start IS NULL OR created_at::DATE >= p_reference_period_start)
    AND (p_reference_period_end IS NULL OR created_at::DATE <= p_reference_period_end);
    
    IF pending_amount > 0 THEN
        RAISE EXCEPTION 'Não é possível gerar declaração de nada consta. Existem débitos pendentes no valor de R$ %', pending_amount;
    END IF;
    
    -- Gerar código de autenticação único
    auth_code := 'NC' || EXTRACT(year FROM NOW()) || LPAD(EXTRACT(month FROM NOW())::TEXT, 2, '0') || 
                 LPAD(EXTRACT(day FROM NOW())::TEXT, 2, '0') || '-' || 
                 UPPER(SUBSTRING(MD5(p_profile_id::TEXT || NOW()::TEXT), 1, 8));
    
    -- Criar declaração
    INSERT INTO financial_declarations (
        profile_id, declaration_type, title, content,
        reference_period_start, reference_period_end, auth_code
    ) VALUES (
        p_profile_id,
        'nothing_owed',
        'Declaração de Nada Consta Financeiro',
        'Declaramos para os devidos fins que ' || student_name || 
        ' não possui débitos pendentes em nossa instituição' ||
        CASE 
            WHEN p_reference_period_start IS NOT NULL THEN 
                ' no período de ' || p_reference_period_start || ' a ' || COALESCE(p_reference_period_end, CURRENT_DATE)
            ELSE ' até a presente data'
        END || '.\n\nEsta declaração é válida por 30 dias a partir da data de emissão.',
        p_reference_period_start,
        COALESCE(p_reference_period_end, CURRENT_DATE),
        auth_code
    ) RETURNING id INTO declaration_id;
    
    RETURN declaration_id;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular juros e multas
CREATE OR REPLACE FUNCTION calculate_late_fees(
    p_original_amount NUMERIC,
    p_due_date DATE,
    p_interest_rate NUMERIC DEFAULT 0.033, -- 3.3% ao mês
    p_late_fee_rate NUMERIC DEFAULT 0.02 -- 2% de multa
)
RETURNS TABLE(
    late_fee NUMERIC,
    interest NUMERIC,
    total_amount NUMERIC,
    days_overdue INTEGER
) AS $$
DECLARE
    days_late INTEGER;
    calculated_late_fee NUMERIC;
    calculated_interest NUMERIC;
BEGIN
    days_late := GREATEST(0, (CURRENT_DATE - p_due_date)::INTEGER);
    
    IF days_late = 0 THEN
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, p_original_amount, 0;
        RETURN;
    END IF;
    
    -- Multa fixa
    calculated_late_fee := p_original_amount * p_late_fee_rate;
    
    -- Juros proporcionais aos dias
    calculated_interest := p_original_amount * p_interest_rate * (days_late / 30.0);
    
    RETURN QUERY SELECT 
        calculated_late_fee,
        calculated_interest,
        p_original_amount + calculated_late_fee + calculated_interest,
        days_late;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar contrato de prestação de serviço
CREATE OR REPLACE FUNCTION generate_service_contract(
    p_provider_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_value NUMERIC,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
    contract_id UUID;
BEGIN
    INSERT INTO contracts (
        provider_id, title, description, value,
        start_date, end_date, status
    ) VALUES (
        p_provider_id, p_title, p_description, p_value,
        p_start_date, p_end_date, 'active'
    ) RETURNING id INTO contract_id;
    
    -- Criar transação financeira relacionada
    INSERT INTO financial_transactions (
        description, amount, type, status, due_date,
        provider_id, related_contract_id
    ) VALUES (
        'Pagamento - ' || p_title,
        p_value,
        'expense',
        'pending',
        p_end_date::DATE,
        p_provider_id,
        contract_id
    );
    
    RETURN contract_id;
END;
$$ LANGUAGE plpgsql;

-- Função para processar pagamento de boleto
CREATE OR REPLACE FUNCTION process_bank_slip_payment(
    p_bank_slip_id UUID,
    p_payment_amount NUMERIC,
    p_payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id UUID
) AS $$
DECLARE
    slip_record RECORD;
    new_transaction_id UUID;
BEGIN
    -- Buscar boleto
    SELECT * INTO slip_record
    FROM bank_slips
    WHERE id = p_bank_slip_id
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Boleto não encontrado ou já pago'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Atualizar boleto
    UPDATE bank_slips
    SET status = 'paid',
        payment_date = p_payment_date,
        final_amount = p_payment_amount
    WHERE id = p_bank_slip_id;
    
    -- Criar transação financeira
    INSERT INTO financial_transactions (
        description, amount, type, status, paid_at, profile_id
    ) VALUES (
        'Pagamento de boleto bancário',
        p_payment_amount,
        'income',
        'completed',
        p_payment_date,
        slip_record.student_id
    ) RETURNING id INTO new_transaction_id;
    
    -- Enviar confirmação por email
    INSERT INTO billing_notifications_log (
        transaction_id, profile_id, notification_type,
        recipient_contact, message_content, status
    )
    SELECT 
        new_transaction_id,
        slip_record.student_id,
        'email',
        p.email,
        'Confirmamos o recebimento do seu pagamento no valor de R$ ' || p_payment_amount,
        'pending'
    FROM profiles p
    WHERE p.id = slip_record.student_id;
    
    RETURN QUERY SELECT TRUE, 'Pagamento processado com sucesso'::TEXT, new_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- View para dashboard financeiro (usando função para evitar problemas de imutabilidade)
CREATE OR REPLACE FUNCTION get_financial_dashboard()
RETURNS TABLE(
    metric_name TEXT,
    value NUMERIC,
    type TEXT
) AS $$
DECLARE
    current_month_start DATE;
    current_month_end DATE;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    current_month_end := current_month_start + INTERVAL '1 month';
    
    RETURN QUERY
    SELECT 
        'Receitas do Mês'::TEXT as metric_name,
        COALESCE(SUM(ft.amount), 0) as value,
        'currency'::TEXT as type
    FROM financial_transactions ft
    WHERE ft.type = 'income'
    AND ft.status = 'completed'
    AND ft.created_at >= current_month_start
    AND ft.created_at < current_month_end
    
    UNION ALL
    
    SELECT 
        'Despesas do Mês'::TEXT as metric_name,
        COALESCE(SUM(ft.amount), 0) as value,
        'currency'::TEXT as type
    FROM financial_transactions ft
    WHERE ft.type = 'expense'
    AND ft.status = 'completed'
    AND ft.created_at >= current_month_start
    AND ft.created_at < current_month_end
    
    UNION ALL
    
    SELECT 
        'Valores em Atraso'::TEXT as metric_name,
        COALESCE(SUM(ft.amount), 0) as value,
        'currency'::TEXT as type
    FROM financial_transactions ft
    WHERE ft.status = 'pending'
    AND ft.due_date < CURRENT_DATE
    
    UNION ALL
    
    SELECT 
        'Estudantes Inadimplentes'::TEXT as metric_name,
        COUNT(DISTINCT ft.profile_id) as value,
        'count'::TEXT as type
    FROM financial_transactions ft
    WHERE ft.status = 'pending'
    AND ft.due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para backup de dados financeiros
CREATE OR REPLACE FUNCTION backup_financial_data(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'backup_date', NOW(),
        'period_start', p_start_date,
        'period_end', p_end_date,
        'financial_transactions', (
            SELECT jsonb_agg(row_to_json(ft))
            FROM financial_transactions ft
            WHERE ft.created_at::DATE BETWEEN p_start_date AND p_end_date
        ),
        'bank_slips', (
            SELECT jsonb_agg(row_to_json(bs))
            FROM bank_slips bs
            WHERE bs.created_at::DATE BETWEEN p_start_date AND p_end_date
        ),
        'invoices', (
            SELECT jsonb_agg(row_to_json(i))
            FROM invoices i
            WHERE i.created_at::DATE BETWEEN p_start_date AND p_end_date
        )
    ) INTO backup_data;
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at 
ON financial_transactions (created_at);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_status 
ON financial_transactions (type, status);

CREATE INDEX IF NOT EXISTS idx_bank_slips_status_due_date 
ON bank_slips (status, due_date);

-- Grants para as novas funções
GRANT EXECUTE ON FUNCTION bulk_register_student_financial_data(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_register_scholarship_students(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_nothing_owed_declaration(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_late_fees(NUMERIC, DATE, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_service_contract(UUID, TEXT, TEXT, NUMERIC, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION process_bank_slip_payment(UUID, NUMERIC, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION backup_financial_data(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_dashboard() TO authenticated;