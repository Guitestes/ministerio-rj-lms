-- Script para corrigir todas as funções duplicadas no sistema de relatórios
-- Remove todas as versões antigas e mantém apenas as versões mais recentes

-- Remove todas as versões existentes das funções de relatório
DROP FUNCTION IF EXISTS reports.get_quantitative_summary(DATE, DATE, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS reports.get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);

DROP FUNCTION IF EXISTS reports.get_evaluation_results(TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS get_evaluation_results(TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS public.get_evaluation_results(TEXT, TEXT, VARCHAR, UUID);

DROP FUNCTION IF EXISTS reports.get_academic_works_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_academic_works_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.get_academic_works_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);

DROP FUNCTION IF EXISTS reports.get_certificates_summary(TEXT, TEXT, UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_certificates_summary(TEXT, TEXT, UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.get_certificates_summary(TEXT, TEXT, UUID, VARCHAR);

DROP FUNCTION IF EXISTS reports.get_enrollment_by_position(DATE, DATE, UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_enrollment_by_position(DATE, DATE, UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.get_enrollment_by_position(DATE, DATE, UUID, VARCHAR);

-- Remove qualquer outra variação que possa existir
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname IN ('get_quantitative_summary', 'get_evaluation_results', 'get_academic_works_summary', 'get_certificates_summary', 'get_enrollment_by_position')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)', 
                      func_record.schema_name, 
                      func_record.function_name, 
                      func_record.args);
        RAISE NOTICE 'Dropped function: %.%(%)', 
                     func_record.schema_name, 
                     func_record.function_name, 
                     func_record.args;
    END LOOP;
END
$$;

-- Remove views duplicadas se existirem
DROP VIEW IF EXISTS class_tracking_report CASCADE;
DROP VIEW IF EXISTS students_per_class_report CASCADE;

-- Confirma que todas as versões foram removidas
SELECT 
    n.nspname as schema_name, 
    p.proname as function_name, 
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_quantitative_summary', 'get_evaluation_results', 'get_academic_works_summary', 'get_certificates_summary', 'get_enrollment_by_position');

-- Mensagem de confirmação
SELECT 'Todas as versões duplicadas das funções de relatório foram removidas. Execute agora o arquivo 02_reports_functions.sql para recriar as funções.' as status;