-- Script para corrigir conflito de funções get_dropout_students
-- Remove a função antiga e cria a nova com assinatura correta

-- Remover todas as versões da função get_dropout_students
-- Primeiro, vamos remover especificando as assinaturas exatas
DROP FUNCTION IF EXISTS get_dropout_students(start_date_param TEXT, end_date_param TEXT);
DROP FUNCTION IF EXISTS get_dropout_students(class_id_param UUID, course_id_param UUID, start_date_param TEXT, end_date_param TEXT);
DROP FUNCTION IF EXISTS get_dropout_students(class_id_param UUID, course_id_param UUID, segment_param VARCHAR, min_frequency NUMERIC);
DROP FUNCTION IF EXISTS get_dropout_students();

-- Se ainda houver conflito, remover todas as funções com esse nome
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_dropout_students' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.get_dropout_students(' || func_record.args || ')';
    END LOOP;
END
$$;

-- Criar a função correta com a assinatura esperada pela aplicação
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
    segment_name VARCHAR(100),
    enrollment_date TIMESTAMP WITH TIME ZONE,
    progress_percentage NUMERIC,
    last_access TIMESTAMP WITH TIME ZONE,
    position_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        p.email as student_email,
        cl.name as class_name,
        c.title as course_name,
        cs.name as segment_name,
        e.enrolled_at as enrollment_date,
        e.progress::NUMERIC as progress_percentage,
        p.last_sign_in_at as last_access,
        up.name::TEXT as position_name
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN classes cl ON e.class_id = cl.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    LEFT JOIN user_positions up ON p.position_id = up.id
    WHERE 
        e.progress > 0 -- Iniciaram o curso
        AND e.progress < min_frequency -- Não atingiram frequência mínima
        AND e.status != 'completed'
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (segment_param IS NULL OR cs.name = segment_param)
        AND (cl.end_date IS NULL OR cl.end_date < CURRENT_DATE) -- Turmas encerradas
    ORDER BY e.progress ASC, p.full_name;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION get_dropout_students IS 'Função para relatório de alunos desistentes';