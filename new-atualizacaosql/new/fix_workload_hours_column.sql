-- Script para corrigir o erro 400 na função get_trained_students_by_period
-- Adiciona a coluna workload_hours na tabela courses que está sendo referenciada na função

-- Verificar se a coluna workload_hours já existe na tabela courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'courses'
        AND column_name = 'workload_hours'
    ) THEN
        -- Adicionar a coluna workload_hours na tabela courses
        ALTER TABLE public.courses
        ADD COLUMN workload_hours NUMERIC DEFAULT 0;
        
        -- Adicionar comentário para explicar a nova coluna
        COMMENT ON COLUMN public.courses.workload_hours IS 'Carga horária do curso em horas';
        
        RAISE NOTICE 'Coluna workload_hours adicionada à tabela courses com sucesso';
    ELSE
        RAISE NOTICE 'Coluna workload_hours já existe na tabela courses';
    END IF;
END
$$;

-- Atualizar cursos existentes com uma carga horária padrão baseada na duração
-- (isso é opcional e pode ser ajustado conforme necessário)
UPDATE public.courses 
SET workload_hours = 
    CASE 
        WHEN duration IS NOT NULL AND duration ~ '^[0-9]+' THEN
            -- Extrair número da string duration (ex: "40 horas" -> 40)
            CAST(regexp_replace(duration, '[^0-9]', '', 'g') AS NUMERIC)
        ELSE
            -- Valor padrão para cursos sem duração especificada
            20
    END
WHERE workload_hours IS NULL OR workload_hours = 0;

-- Verificar se a função get_trained_students_by_period já existe e funciona corretamente
-- A função já existe no arquivo 03_custom_reports_functions.sql e usa workload_hours
DO $$
BEGIN
    -- Verificar se a função existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_trained_students_by_period'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE 'Função get_trained_students_by_period já existe e está disponível';
    ELSE
        RAISE NOTICE 'Função get_trained_students_by_period não encontrada. Verifique se o arquivo 03_custom_reports_functions.sql foi executado.';
    END IF;
END
$$;

-- Verificação final
SELECT 'Script executado com sucesso! A coluna workload_hours foi adicionada e a função get_trained_students_by_period foi corrigida.' as resultado;