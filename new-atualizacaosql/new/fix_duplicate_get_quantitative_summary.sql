-- Script para corrigir função duplicada get_quantitative_summary
-- Remove todas as versões antigas e mantém apenas a versão mais recente

-- Remove todas as versões existentes da função
DROP FUNCTION IF EXISTS reports.get_quantitative_summary(DATE, DATE, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS reports.get_quantitative_summary(TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);

-- Remove qualquer outra variação que possa existir
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_quantitative_summary'
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

-- Confirma que todas as versões foram removidas
SELECT 
    n.nspname as schema_name, 
    p.proname as function_name, 
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_quantitative_summary';

-- Mensagem de confirmação
SELECT 'Todas as versões duplicadas da função get_quantitative_summary foram removidas. Execute agora o arquivo 02_reports_functions.sql para recriar a função.' as status;