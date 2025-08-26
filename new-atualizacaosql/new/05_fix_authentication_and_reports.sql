-- Script para corrigir erros de autenticação e relatórios
-- Data: 2024
-- Descrição: Corrige problemas relacionados à coluna last_sign_in_at e funções de relatório

-- 1. Adicionar coluna last_sign_in_at à tabela profiles se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- 2. Atualizar a coluna last_sign_in_at com dados da tabela auth.users
UPDATE public.profiles p
SET last_sign_in_at = au.last_sign_in_at
FROM auth.users au
WHERE p.id = au.id
AND p.last_sign_in_at IS NULL;

-- 3. Verificar se a função get_dropout_students existe e está funcionando
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_dropout_students'
        AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE 'Função get_dropout_students não encontrada. Criando...';
        
        -- Criar a função get_dropout_students se não existir
        EXECUTE '
        CREATE OR REPLACE FUNCTION get_dropout_students(
            class_id_param UUID DEFAULT NULL,
            course_id_param UUID DEFAULT NULL,
            segment_param VARCHAR DEFAULT NULL,
            min_frequency NUMERIC DEFAULT 75.0
        )
        RETURNS TABLE (
            student_id UUID,
            student_name TEXT,
            student_email TEXT,
            class_name TEXT,
            course_name TEXT,
            segment_name TEXT,
            enrollment_date TIMESTAMP WITH TIME ZONE,
            progress_percentage NUMERIC,
            last_access TIMESTAMP WITH TIME ZONE,
            position_name TEXT
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                p.id as student_id,
                COALESCE(p.name, p.email) as student_name,
                COALESCE(p.email, '''') as student_email,
                cl.name as class_name,
                c.title as course_name,
                COALESCE(cs.name, ''Não informado'') as segment_name,
                e.enrolled_at as enrollment_date,
                e.progress as progress_percentage,
                p.last_sign_in_at as last_access,
                COALESCE(up.name, ''Não informado'') as position_name
            FROM enrollments e
            JOIN profiles p ON e.user_id = p.id
            JOIN classes cl ON e.class_id = cl.id
            JOIN courses c ON cl.course_id = c.id
            LEFT JOIN course_segments cs ON c.segment_id = cs.id
            LEFT JOIN user_positions up ON p.position_id = up.id
            WHERE 
                e.progress > 0 -- Iniciaram o curso
                AND e.progress < min_frequency -- Não atingiram frequência mínima
                AND (class_id_param IS NULL OR cl.id = class_id_param)
                AND (course_id_param IS NULL OR c.id = course_id_param)
                AND (segment_param IS NULL OR cs.name ILIKE ''%'' || segment_param || ''%'')
            ORDER BY p.name, c.title;
        END;
        $func$ LANGUAGE plpgsql;';
        
        -- Adicionar comentário
        EXECUTE 'COMMENT ON FUNCTION get_dropout_students IS ''Função para relatório de alunos desistentes'';';
    ELSE
        RAISE NOTICE 'Função get_dropout_students já existe.';
    END IF;
END
$$;

-- 4. Criar views para substituir o uso do método .modify() no Supabase
-- View para class_tracking_report
CREATE OR REPLACE VIEW class_tracking_report AS
SELECT 
    cl.id as class_id,
    cl.name as class_name,
    c.id as course_id,
    c.title as course_name,
    COALESCE(cs.name, 'Não informado') as segment_name,
    CASE 
        WHEN cl.end_date < CURRENT_DATE THEN 'completed'
        WHEN cl.start_date > CURRENT_DATE THEN 'scheduled'
        ELSE 'active'
    END as class_status,
    COUNT(e.id) as total_students,
    COUNT(CASE WHEN e.progress >= 75 THEN 1 END) as completed_students,
    ROUND(AVG(e.progress), 2) as average_progress,
    cl.start_date,
    cl.end_date
FROM classes cl
JOIN courses c ON cl.course_id = c.id
LEFT JOIN course_segments cs ON c.segment_id = cs.id
LEFT JOIN enrollments e ON cl.id = e.class_id
GROUP BY cl.id, cl.name, c.id, c.title, cs.name, cl.start_date, cl.end_date;

-- View para students_per_class_report
CREATE OR REPLACE VIEW students_per_class_report AS
SELECT 
    e.id as enrollment_id,
    p.id as student_id,
    COALESCE(p.name, p.email) as student_name,
    p.email as student_email,
    cl.id as class_id,
    cl.name as class_name,
    c.id as course_id,
    c.title as course_name,
    COALESCE(cs.name, 'Não informado') as segment_name,
    e.progress,
    CASE 
        WHEN e.completed_at IS NOT NULL THEN 'completed'
        WHEN e.progress < 25 THEN 'not_started'
        WHEN e.progress >= 75 THEN 'near_completion'
        ELSE 'in_progress'
    END as enrollment_status,
    e.enrolled_at,
    e.completed_at,
    p.last_sign_in_at
FROM enrollments e
JOIN profiles p ON e.user_id = p.id
JOIN classes cl ON e.class_id = cl.id
JOIN courses c ON cl.course_id = c.id
LEFT JOIN course_segments cs ON c.segment_id = cs.id;

-- 5. Definir proprietário das views
-- Views herdam permissões das tabelas base automaticamente

-- 6. Conceder permissões
GRANT SELECT ON class_tracking_report TO authenticated;
GRANT SELECT ON students_per_class_report TO authenticated;

-- 7. Verificar se todas as funções de relatório existem
SELECT 
    'get_dropout_students' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_dropout_students'
        AND n.nspname = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_expense_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_expense_report'
        AND n.nspname = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'get_enrollment_by_position' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_enrollment_by_position'
        AND n.nspname = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 8. Verificar se a coluna last_sign_in_at foi adicionada
SELECT 
    'profiles.last_sign_in_at' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_sign_in_at'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Comentários
COMMENT ON VIEW class_tracking_report IS 'View para relatório de acompanhamento de turmas';
COMMENT ON VIEW students_per_class_report IS 'View para relatório de alunos por turma';
COMMENT ON COLUMN profiles.last_sign_in_at IS 'Data e hora do último login do usuário';