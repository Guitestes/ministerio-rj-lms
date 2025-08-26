-- Script para funções de relatórios financeiros
-- Implementa os requisitos de relatórios do módulo financeiro

-- 3.3.3.1. Relatório de balanço de recebimentos e pagamentos
CREATE OR REPLACE FUNCTION get_financial_balance_report(
    p_start_date DATE,
    p_end_date DATE,
    p_origin_destination TEXT DEFAULT NULL
)
RETURNS TABLE(
    period_label TEXT,
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_balance NUMERIC,
    origin_destination TEXT,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN (p_end_date - p_start_date) <= 31 THEN 'Mensal'
            WHEN (p_end_date - p_start_date) <= 93 THEN 'Trimestral'
            ELSE 'Anual'
        END as period_label,
        COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END), 0) as net_balance,
        COALESCE(p.name, 'Não especificado') as origin_destination,
        COUNT(ft.id) as transaction_count
    FROM financial_transactions ft
    LEFT JOIN profiles p ON p.id = COALESCE(ft.provider_id, ft.profile_id)
    WHERE ft.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND ft.status = 'completed'
    AND (p_origin_destination IS NULL OR p.name ILIKE '%' || p_origin_destination || '%')
    GROUP BY p.name
    ORDER BY net_balance DESC;
END;
$$ LANGUAGE plpgsql;

-- 3.3.3.2. Resumo financeiro com mapeamento por período e origem/destino
CREATE OR REPLACE FUNCTION get_financial_summary_report(
    p_start_date DATE,
    p_end_date DATE,
    p_period_type VARCHAR DEFAULT 'monthly' -- 'daily', 'weekly', 'monthly', 'yearly'
)
RETURNS TABLE(
    period_start DATE,
    period_end DATE,
    period_label TEXT,
    income_count BIGINT,
    expense_count BIGINT,
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_result NUMERIC,
    avg_transaction_value NUMERIC
) AS $$
DECLARE
    date_trunc_format TEXT;
BEGIN
    -- Definir formato de agrupamento baseado no tipo de período
    CASE p_period_type
        WHEN 'daily' THEN date_trunc_format := 'day';
        WHEN 'weekly' THEN date_trunc_format := 'week';
        WHEN 'monthly' THEN date_trunc_format := 'month';
        WHEN 'yearly' THEN date_trunc_format := 'year';
        ELSE date_trunc_format := 'month';
    END CASE;
    
    RETURN QUERY
    SELECT 
        DATE_TRUNC(date_trunc_format, ft.created_at)::DATE as period_start,
        (DATE_TRUNC(date_trunc_format, ft.created_at) + 
         CASE date_trunc_format
             WHEN 'day' THEN INTERVAL '1 day'
             WHEN 'week' THEN INTERVAL '1 week'
             WHEN 'month' THEN INTERVAL '1 month'
             WHEN 'year' THEN INTERVAL '1 year'
         END - INTERVAL '1 day')::DATE as period_end,
        TO_CHAR(DATE_TRUNC(date_trunc_format, ft.created_at), 'YYYY-MM') as period_label,
        COUNT(CASE WHEN ft.type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN ft.type = 'expense' THEN 1 END) as expense_count,
        COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END), 0) as net_result,
        COALESCE(AVG(ft.amount), 0) as avg_transaction_value
    FROM financial_transactions ft
    WHERE ft.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND ft.status = 'completed'
    GROUP BY DATE_TRUNC(date_trunc_format, ft.created_at)
    ORDER BY period_start;
END;
$$ LANGUAGE plpgsql;

-- 3.3.3.3. Relatório de quitação de débitos
CREATE OR REPLACE FUNCTION get_debt_settlement_report(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_student_id UUID DEFAULT NULL
)
RETURNS TABLE(
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    total_debt NUMERIC,
    paid_amount NUMERIC,
    pending_amount NUMERIC,
    overdue_amount NUMERIC,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    debt_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.name as student_name,
        p.email as student_email,
        COALESCE(SUM(ft.amount), 0) as total_debt,
        COALESCE(SUM(CASE WHEN ft.status = 'completed' THEN ft.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN ft.status = 'pending' AND ft.due_date >= CURRENT_DATE THEN ft.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN ft.status = 'pending' AND ft.due_date < CURRENT_DATE THEN ft.amount ELSE 0 END), 0) as overdue_amount,
        MAX(ft.paid_at) as last_payment_date,
        CASE 
            WHEN SUM(CASE WHEN ft.status = 'pending' THEN ft.amount ELSE 0 END) = 0 THEN 'Quitado'
            WHEN SUM(CASE WHEN ft.status = 'pending' AND ft.due_date < CURRENT_DATE THEN ft.amount ELSE 0 END) > 0 THEN 'Em atraso'
            ELSE 'Em dia'
        END as debt_status
    FROM profiles p
    LEFT JOIN financial_transactions ft ON ft.profile_id = p.id
    WHERE p.role = 'student'
    AND (p_student_id IS NULL OR p.id = p_student_id)
    AND (p_start_date IS NULL OR ft.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR ft.created_at::DATE <= p_end_date)
    GROUP BY p.id, p.name, p.email
    HAVING SUM(ft.amount) > 0
    ORDER BY overdue_amount DESC, pending_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- 3.3.3.4. Previsão de despesas e receitas
CREATE OR REPLACE FUNCTION get_financial_forecast(
    p_months_ahead INTEGER DEFAULT 6
)
RETURNS TABLE(
    forecast_month DATE,
    month_label TEXT,
    projected_income NUMERIC,
    projected_expenses NUMERIC,
    projected_balance NUMERIC,
    confidence_level TEXT
) AS $$
DECLARE
    current_month DATE;
    i INTEGER;
BEGIN
    current_month := DATE_TRUNC('month', CURRENT_DATE);
    
    FOR i IN 1..p_months_ahead LOOP
        RETURN QUERY
        SELECT 
            (current_month + (i || ' months')::INTERVAL)::DATE as forecast_month,
            TO_CHAR(current_month + (i || ' months')::INTERVAL, 'YYYY-MM') as month_label,
            -- Projeção baseada na média dos últimos 6 meses
            COALESCE((
                SELECT AVG(monthly_income) 
                FROM (
                    SELECT SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END) as monthly_income
                    FROM financial_transactions ft
                    WHERE ft.created_at >= CURRENT_DATE - INTERVAL '6 months'
                    AND ft.status = 'completed'
                    GROUP BY DATE_TRUNC('month', ft.created_at)
                ) avg_calc
            ), 0) as projected_income,
            COALESCE((
                SELECT AVG(monthly_expense) 
                FROM (
                    SELECT SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END) as monthly_expense
                    FROM financial_transactions ft
                    WHERE ft.created_at >= CURRENT_DATE - INTERVAL '6 months'
                    AND ft.status = 'completed'
                    GROUP BY DATE_TRUNC('month', ft.created_at)
                ) avg_calc
            ), 0) as projected_expenses,
            COALESCE((
                SELECT AVG(monthly_balance) 
                FROM (
                    SELECT SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END) as monthly_balance
                    FROM financial_transactions ft
                    WHERE ft.created_at >= CURRENT_DATE - INTERVAL '6 months'
                    AND ft.status = 'completed'
                    GROUP BY DATE_TRUNC('month', ft.created_at)
                ) avg_calc
            ), 0) as projected_balance,
            CASE 
                WHEN i <= 2 THEN 'Alta'
                WHEN i <= 4 THEN 'Média'
                ELSE 'Baixa'
            END as confidence_level;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3.3.3.5. Nível de inadimplência das turmas
CREATE OR REPLACE FUNCTION get_class_delinquency_report(
    p_course_id UUID DEFAULT NULL
)
RETURNS TABLE(
    course_id UUID,
    course_name TEXT,
    class_id UUID,
    class_name TEXT,
    total_students BIGINT,
    delinquent_students BIGINT,
    delinquency_rate NUMERIC,
    total_overdue_amount NUMERIC,
    avg_overdue_per_student NUMERIC,
    delinquency_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as course_id,
        c.name as course_name,
        cl.id as class_id,
        cl.name as class_name,
        COUNT(DISTINCT e.student_id) as total_students,
        COUNT(DISTINCT CASE 
            WHEN EXISTS (
                SELECT 1 FROM financial_transactions ft 
                WHERE ft.profile_id = e.student_id 
                AND ft.status = 'pending' 
                AND ft.due_date < CURRENT_DATE
            ) THEN e.student_id 
        END) as delinquent_students,
        ROUND(
            (COUNT(DISTINCT CASE 
                WHEN EXISTS (
                    SELECT 1 FROM financial_transactions ft 
                    WHERE ft.profile_id = e.student_id 
                    AND ft.status = 'pending' 
                    AND ft.due_date < CURRENT_DATE
                ) THEN e.student_id 
            END)::NUMERIC / NULLIF(COUNT(DISTINCT e.student_id), 0)) * 100, 2
        ) as delinquency_rate,
        COALESCE(SUM(
            CASE WHEN ft.status = 'pending' AND ft.due_date < CURRENT_DATE 
            THEN ft.amount ELSE 0 END
        ), 0) as total_overdue_amount,
        COALESCE(AVG(
            CASE WHEN ft.status = 'pending' AND ft.due_date < CURRENT_DATE 
            THEN ft.amount ELSE NULL END
        ), 0) as avg_overdue_per_student,
        CASE 
            WHEN ROUND(
                (COUNT(DISTINCT CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM financial_transactions ft2 
                        WHERE ft2.profile_id = e.student_id 
                        AND ft2.status = 'pending' 
                        AND ft2.due_date < CURRENT_DATE
                    ) THEN e.student_id 
                END)::NUMERIC / NULLIF(COUNT(DISTINCT e.student_id), 0)) * 100, 2
            ) >= 30 THEN 'Alto'
            WHEN ROUND(
                (COUNT(DISTINCT CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM financial_transactions ft2 
                        WHERE ft2.profile_id = e.student_id 
                        AND ft2.status = 'pending' 
                        AND ft2.due_date < CURRENT_DATE
                    ) THEN e.student_id 
                END)::NUMERIC / NULLIF(COUNT(DISTINCT e.student_id), 0)) * 100, 2
            ) >= 15 THEN 'Médio'
            ELSE 'Baixo'
        END as delinquency_level
    FROM courses c
    JOIN classes cl ON cl.course_id = c.id
    JOIN enrollments e ON e.class_id = cl.id
    LEFT JOIN financial_transactions ft ON ft.profile_id = e.student_id
    WHERE (p_course_id IS NULL OR c.id = p_course_id)
    GROUP BY c.id, c.name, cl.id, cl.name
    ORDER BY delinquency_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para dashboard financeiro
CREATE OR REPLACE FUNCTION get_financial_dashboard_summary()
RETURNS TABLE(
    total_revenue_month NUMERIC,
    total_expenses_month NUMERIC,
    pending_receivables NUMERIC,
    overdue_amount NUMERIC,
    active_students BIGINT,
    delinquent_students BIGINT,
    avg_delinquency_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Receita do mês atual
        COALESCE((
            SELECT SUM(ft.amount) 
            FROM financial_transactions ft 
            WHERE ft.type = 'income' 
            AND ft.status = 'completed'
            AND DATE_TRUNC('month', ft.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        ), 0) as total_revenue_month,
        
        -- Despesas do mês atual
        COALESCE((
            SELECT SUM(ft.amount) 
            FROM financial_transactions ft 
            WHERE ft.type = 'expense' 
            AND ft.status = 'completed'
            AND DATE_TRUNC('month', ft.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        ), 0) as total_expenses_month,
        
        -- Valores a receber
        COALESCE((
            SELECT SUM(ft.amount) 
            FROM financial_transactions ft 
            WHERE ft.status = 'pending'
            AND ft.due_date >= CURRENT_DATE
        ), 0) as pending_receivables,
        
        -- Valores em atraso
        COALESCE((
            SELECT SUM(ft.amount) 
            FROM financial_transactions ft 
            WHERE ft.status = 'pending'
            AND ft.due_date < CURRENT_DATE
        ), 0) as overdue_amount,
        
        -- Estudantes ativos
        COALESCE((
            SELECT COUNT(DISTINCT e.student_id)
            FROM enrollments e
            WHERE e.status = 'active'
        ), 0) as active_students,
        
        -- Estudantes inadimplentes
        COALESCE((
            SELECT COUNT(DISTINCT ft.profile_id)
            FROM financial_transactions ft
            WHERE ft.status = 'pending'
            AND ft.due_date < CURRENT_DATE
        ), 0) as delinquent_students,
        
        -- Taxa média de inadimplência
        COALESCE((
            SELECT AVG(delinquency_rate)
            FROM get_class_delinquency_report()
        ), 0) as avg_delinquency_rate;
END;
$$ LANGUAGE plpgsql;