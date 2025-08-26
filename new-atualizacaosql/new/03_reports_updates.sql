-- Script de atualizações para sistema de relatórios
-- Data: 2024
-- Descrição: Atualizações incrementais para funções de relatório
-- IMPORTANTE: Execute apenas se o arquivo 02_reports_functions.sql já foi executado

-- Verificar se a função get_expense_report já existe antes de criar
DO $$
BEGIN
    -- Verificar se a função get_expense_report existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_expense_report'
    ) THEN
        -- Criar função get_expense_report se não existir
        EXECUTE '
        CREATE OR REPLACE FUNCTION get_expense_report(
            start_date_param TEXT DEFAULT NULL,
            end_date_param TEXT DEFAULT NULL,
            course_id_param UUID DEFAULT NULL,
            class_id_param UUID DEFAULT NULL
        )
        RETURNS TABLE (
            course_id UUID,
            course_name TEXT,
            class_id UUID,
            class_name TEXT,
            course_type VARCHAR,
            tutor_expenses NUMERIC,
            resource_expenses NUMERIC,
            total_expenses NUMERIC,
            period TEXT
        ) AS $func$
        BEGIN
            RETURN QUERY
            WITH expense_data AS (
                SELECT 
                    c.id as course_id,
                    c.title as course_name,
                    cl.id as class_id,
                    cl.name as class_name,
                    COALESCE(c.course_type, 'presencial') as course_type,
                    COALESCE(SUM(CASE WHEN ft.description ILIKE ''%tutor%'' OR ft.description ILIKE ''%professor%'' THEN ft.amount ELSE 0 END), 0) as tutor_expenses,
                    COALESCE(SUM(CASE WHEN ft.description ILIKE ''%material%'' OR ft.description ILIKE ''%recurso%'' THEN ft.amount ELSE 0 END), 0) as resource_expenses,
                    COALESCE(SUM(ft.amount), 0) as total_expenses,
                    TO_CHAR(ft.created_at, ''YYYY-MM'') as period
                FROM courses c
                LEFT JOIN classes cl ON c.id = cl.course_id
                LEFT JOIN financial_transactions ft ON (
                    ft.type = ''expense'' AND 
                    (ft.description ILIKE ''%'' || c.title || ''%'' OR 
                     ft.description ILIKE ''%'' || cl.name || ''%'')
                )
                WHERE 
                    (start_date_param IS NULL OR start_date_param = '''' OR ft.created_at::date >= start_date_param::date)
                    AND (end_date_param IS NULL OR end_date_param = '''' OR ft.created_at::date <= end_date_param::date)
                    AND (course_id_param IS NULL OR c.id = course_id_param)
                    AND (class_id_param IS NULL OR cl.id = class_id_param)
                GROUP BY c.id, c.title, cl.id, cl.name, c.course_type, TO_CHAR(ft.created_at, ''YYYY-MM'')
            )
            SELECT 
                ed.course_id,
                ed.course_name,
                ed.class_id,
                ed.class_name,
                ed.course_type,
                ed.tutor_expenses,
                ed.resource_expenses,
                ed.total_expenses,
                ed.period
            FROM expense_data ed
            ORDER BY ed.course_name, ed.class_name, ed.period;
        END;
        $func$ LANGUAGE plpgsql;';
        
        RAISE NOTICE 'Função get_expense_report criada com sucesso.';
    ELSE
        RAISE NOTICE 'Função get_expense_report já existe. Nenhuma alteração necessária.';
    END IF;
END
$$;

-- Adicionar comentário para a função get_expense_report se não existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_expense_report'
    ) THEN
        -- Verificar se o comentário já existe
        IF NOT EXISTS (
            SELECT 1 FROM pg_description d
            JOIN pg_proc p ON d.objoid = p.oid
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'get_expense_report'
        ) THEN
            EXECUTE 'COMMENT ON FUNCTION get_expense_report(TEXT, TEXT, UUID, UUID) IS ''Função para gerar relatório de despesas por curso e turma'';';
            RAISE NOTICE 'Comentário adicionado para a função get_expense_report.';
        ELSE
            RAISE NOTICE 'Comentário para get_expense_report já existe.';
        END IF;
    END IF;
END
$$;

-- Verificar se todas as funções de relatório estão disponíveis
SELECT 
    'get_quantitative_summary' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_quantitative_summary'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_evaluation_results' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_evaluation_results'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_academic_works_summary' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_academic_works_summary'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_certificates_summary' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_certificates_summary'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_enrollment_by_position' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_enrollment_by_position'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_expense_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_expense_report'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
ORDER BY function_name;

-- Mensagem final
SELECT 'Script de atualizações executado com sucesso. Verifique o status das funções acima.' as message;