-- Script para corrigir o erro de função não única
-- Remove todas as versões existentes da função get_trained_students_by_period

-- Primeiro, remover todas as versões possíveis da função
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_trained_students_by_period'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Removida função: % com argumentos: %', func_record.proname, func_record.args;
    END LOOP;
END
$$;

-- Remover versões específicas conhecidas
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period() CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT, TEXT) CASCADE;

-- Verificar se ainda existem funções com esse nome
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc 
    WHERE proname = 'get_trained_students_by_period';
    
    IF func_count > 0 THEN
        RAISE NOTICE 'Ainda existem % funções com o nome get_trained_students_by_period', func_count;
    ELSE
        RAISE NOTICE 'Todas as funções get_trained_students_by_period foram removidas com sucesso';
    END IF;
END
$$;

SELECT 'Script de limpeza executado com sucesso!' as resultado;