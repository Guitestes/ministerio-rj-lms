-- Script para corrigir funções de relatório com erros
-- Data: 2024
-- Descrição: Recria as funções get_expense_report, get_tutor_payments e get_training_hours_report para corrigir erros

-- Remover versões antigas das funções
DROP FUNCTION IF EXISTS get_expense_report(TEXT, TEXT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_expense_report(UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_tutor_payments(UUID, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_training_hours_report(TEXT, TEXT, UUID, UUID, TEXT) CASCADE;

-- Recriar função get_expense_report corrigida (resolver ambiguidade de class_id)
CREATE OR REPLACE FUNCTION get_expense_report(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    course_id UUID,
    course_name TEXT,
    class_id UUID,
    class_name TEXT,
    course_type TEXT,
    tutor_expenses NUMERIC,
    resource_expenses NUMERIC,
    total_expenses NUMERIC,
    period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as course_id,
        c.title as course_name,
        cl.id as class_id,
        cl.name as class_name,
        COALESCE(c.course_type, 'presencial') as course_type,
        COALESCE(SUM(CASE WHEN ft.description ILIKE '%tutor%' OR ft.description ILIKE '%professor%' THEN ft.amount ELSE 0 END), 0) as tutor_expenses,
        COALESCE(SUM(CASE WHEN ft.description NOT ILIKE '%tutor%' AND ft.description NOT ILIKE '%professor%' THEN ft.amount ELSE 0 END), 0) as resource_expenses,
        COALESCE(SUM(ft.amount), 0)::NUMERIC as total_expenses,
        TO_CHAR(ft.created_at, 'YYYY-MM') as period
    FROM courses c
    LEFT JOIN classes cl ON c.id = cl.course_id
    LEFT JOIN financial_transactions ft ON (
        ft.type = 'expense' 
        AND ft.status IN ('paid', 'pending')
        AND (
            ft.description ILIKE '%' || c.title || '%' 
            OR ft.description ILIKE '%' || cl.name || '%'
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = ft.profile_id 
                AND p.id IN (
                    SELECT instructor_id FROM classes WHERE classes.course_id = c.id
                    UNION
                    SELECT user_id FROM enrollments WHERE enrollments.class_id = cl.id
                )
            )
        )
    )
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (
            start_date_param IS NULL 
            OR start_date_param = '' 
            OR ft.created_at IS NULL 
            OR ft.created_at::date >= start_date_param::date
        )
        AND (
            end_date_param IS NULL 
            OR end_date_param = '' 
            OR ft.created_at IS NULL 
            OR ft.created_at::date <= end_date_param::date
        )
    GROUP BY c.id, c.title, cl.id, cl.name, c.course_type, TO_CHAR(ft.created_at, 'YYYY-MM')
    ORDER BY c.title, cl.name, period;
END;
$$ LANGUAGE plpgsql;

-- Recriar função get_tutor_payments corrigida (corrigir referência à tabela service_price_list)
CREATE OR REPLACE FUNCTION get_tutor_payments(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    tutor_id_param UUID DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    tutor_id UUID,
    tutor_name TEXT,
    course_name TEXT,
    class_name TEXT,
    total_lessons BIGINT,
    total_evaluations BIGINT,
    lesson_payment NUMERIC,
    evaluation_payment NUMERIC,
    total_payment NUMERIC,
    period_start DATE,
    period_end DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as tutor_id,
        p.full_name as tutor_name,
        c.title as course_name,
        cl.name as class_name,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT q.id) as total_evaluations,
        (COUNT(DISTINCT l.id) * COALESCE(spl_lesson.price, 50.0)) as lesson_payment,
        (COUNT(DISTINCT q.id) * COALESCE(spl_eval.price, 25.0)) as evaluation_payment,
        ((COUNT(DISTINCT l.id) * COALESCE(spl_lesson.price, 50.0)) + 
         (COUNT(DISTINCT q.id) * COALESCE(spl_eval.price, 25.0))) as total_payment,
        COALESCE(start_date_param::date, DATE_TRUNC('month', CURRENT_DATE)::date) as period_start,
        COALESCE(end_date_param::date, CURRENT_DATE) as period_end
    FROM profiles p
    JOIN classes cl ON cl.instructor_id = p.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN modules m ON cl.course_id = m.course_id
    LEFT JOIN lessons l ON m.id = l.module_id AND 
        (start_date_param IS NULL OR start_date_param = '' OR l.created_at::date >= start_date_param::date) AND
        (end_date_param IS NULL OR end_date_param = '' OR l.created_at::date <= end_date_param::date)
    LEFT JOIN quizzes q ON c.id = q.course_id AND
        (start_date_param IS NULL OR start_date_param = '' OR q.created_at::date >= start_date_param::date) AND
        (end_date_param IS NULL OR end_date_param = '' OR q.created_at::date <= end_date_param::date)
    LEFT JOIN service_price_list spl_lesson ON spl_lesson.service_name = 'lesson_tutoring'
    LEFT JOIN service_price_list spl_eval ON spl_eval.service_name = 'evaluation_tutoring'
    WHERE 
        p.role = 'professor'
        AND (course_id_param IS NULL OR cl.course_id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (tutor_id_param IS NULL OR p.id = tutor_id_param)
    GROUP BY p.id, p.full_name, c.title, cl.name, spl_lesson.price, spl_eval.price
    ORDER BY p.full_name, c.title;
END;
$$ LANGUAGE plpgsql;

-- Recriar função get_training_hours_report corrigida (corrigir tipos de retorno)
CREATE OR REPLACE FUNCTION get_training_hours_report(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    student_id_param UUID DEFAULT NULL,
    course_type_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    course_id UUID,
    course_name TEXT,
    course_type TEXT,
    total_hours NUMERIC,
    completed_hours NUMERIC,
    progress_percentage NUMERIC,
    period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        c.id as course_id,
        c.title as course_name,
        COALESCE(c.course_type, 'presencial') as course_type,
        COALESCE(c.workload_hours, 0)::NUMERIC as total_hours,
        ROUND((COALESCE(c.workload_hours, 0)::NUMERIC * e.progress::NUMERIC / 100), 2) as completed_hours,
        e.progress::NUMERIC as progress_percentage,
        TO_CHAR(e.enrolled_at, 'YYYY-MM') as period
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN classes cl ON e.class_id = cl.id
    JOIN courses c ON cl.course_id = c.id
    WHERE 
        (start_date_param IS NULL OR start_date_param = '' OR e.enrolled_at::date >= start_date_param::date)
        AND (end_date_param IS NULL OR end_date_param = '' OR e.enrolled_at::date <= end_date_param::date)
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (student_id_param IS NULL OR p.id = student_id_param)
        AND (course_type_param IS NULL OR COALESCE(c.course_type, 'presencial') = course_type_param)
    ORDER BY p.full_name, c.title;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas funções
COMMENT ON FUNCTION get_expense_report IS 'Função para relatório de gastos por curso e turma';
COMMENT ON FUNCTION get_tutor_payments IS 'Função para relatório de pagamento de tutores';
COMMENT ON FUNCTION get_training_hours_report IS 'Função para relatório de horas de treinamento por aluno e curso';

-- Verificar se as funções foram criadas com sucesso
SELECT 
    'get_expense_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_expense_report'
    ) THEN 'CRIADA' ELSE 'ERRO' END as status
UNION ALL
SELECT 
    'get_tutor_payments' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_tutor_payments'
    ) THEN 'CRIADA' ELSE 'ERRO' END as status
UNION ALL
SELECT 
    'get_training_hours_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_training_hours_report'
    ) THEN 'CRIADA' ELSE 'ERRO' END as status;

SELECT 'Funções de relatório corrigidas com sucesso!' as message;