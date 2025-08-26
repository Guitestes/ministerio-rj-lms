-- Script para corrigir o erro de enum enrollment_status
-- O problema é que as funções estão retornando 'completed' mas o enum só aceita:
-- 'active', 'inactive', 'locked', 'cancelled', 'withdrawn'

-- PARTE 1: Adicionar 'completed' ao enum (deve ser executada separadamente)
DO $$
BEGIN
    -- Verificar se o valor 'completed' já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'public.enrollment_status'::regtype 
        AND enumlabel = 'completed'
    ) THEN
        -- Adicionar 'completed' ao enum
        ALTER TYPE public.enrollment_status ADD VALUE 'completed';
        RAISE NOTICE 'Valor "completed" adicionado ao enum enrollment_status';
    ELSE
        RAISE NOTICE 'Valor "completed" já existe no enum enrollment_status';
    END IF;
END
$$;

-- COMMIT necessário antes de usar o novo valor do enum
-- Execute este script primeiro, depois execute o 10_fix_enrollment_status_functions.sql

DO $$
BEGIN
    RAISE NOTICE 'PARTE 1 concluída: valor "completed" adicionado ao enum enrollment_status';
    RAISE NOTICE 'Execute agora o script 10_fix_enrollment_status_functions.sql';
END
$$;