-- Script para corrigir a função get_student_progress
-- Corrige erro 42703: column "e.student_id" does not exist
-- Data: 2024

-- 1. Remover a função existente se houver
DROP FUNCTION IF EXISTS get_student_progress(TEXT, TEXT, TEXT);

-- 2. Criar a função corrigida com as colunas corretas
-- Nota: Usando TEXT para compatibilidade com frontend que pode enviar strings
CREATE OR REPLACE FUNCTION get_student_progress(
    course_id_param TEXT DEFAULT NULL,
    class_id_param TEXT DEFAULT NULL,
    segment_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    course_name TEXT,
    class_name TEXT,
    enrollment_date TIMESTAMP WITH TIME ZONE,
    progress_percentage NUMERIC,
    status TEXT,
    last_access TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.user_id as student_id,
        COALESCE(p.name, 'Não informado')::TEXT as student_name,
        COALESCE(p.email, 'Não informado')::TEXT as student_email,
        COALESCE(c.title, 'Não informado')::TEXT as course_name,
        COALESCE(cl.name, 'Não informado')::TEXT as class_name,
        e.enrolled_at as enrollment_date,
        COALESCE(e.progress::NUMERIC, 0) as progress_percentage,
        CASE 
            WHEN COALESCE(e.progress, 0) = 0 THEN 'Não iniciado'
            WHEN COALESCE(e.progress, 0) < 25 THEN 'Iniciado'
            WHEN COALESCE(e.progress, 0) < 75 THEN 'Em progresso'
            WHEN COALESCE(e.progress, 0) < 100 THEN 'Quase concluído'
            ELSE 'Concluído'
        END::TEXT as status,
        COALESCE(p.last_sign_in_at, e.enrolled_at) as last_access
    FROM enrollments e
    LEFT JOIN profiles p ON e.user_id = p.id
    LEFT JOIN classes cl ON e.class_id = cl.id
    LEFT JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    WHERE 
        (course_id_param IS NULL OR course_id_param = '' OR c.id = course_id_param::UUID)
        AND (class_id_param IS NULL OR class_id_param = '' OR cl.id = class_id_param::UUID)
        AND (segment_param IS NULL OR segment_param = '' OR cs.name ILIKE '%' || segment_param || '%')
        AND COALESCE(e.progress, 0) < 25  -- Foco em alunos que não iniciaram ou iniciaram pouco
    ORDER BY e.enrolled_at DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Corrigir também a função get_registered_students
DROP FUNCTION IF EXISTS get_registered_students(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_registered_students(
    course_id_param TEXT DEFAULT NULL,
    class_id_param TEXT DEFAULT NULL,
    segment_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    student_role TEXT,
    registration_date TIMESTAMP WITH TIME ZONE,
    course_name TEXT,
    class_name TEXT,
    enrollment_status TEXT,
    last_access TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id as student_id,
        COALESCE(p.name, 'Não informado')::TEXT as student_name,
        COALESCE(p.email, 'Não informado')::TEXT as student_email,
        COALESCE(p.role, 'student')::TEXT as student_role,
        p.created_at as registration_date,
        COALESCE(c.title, 'Não matriculado')::TEXT as course_name,
        COALESCE(cl.name, 'Não matriculado')::TEXT as class_name,
        CASE 
            WHEN e.id IS NOT NULL THEN 'Matriculado'
            ELSE 'Cadastrado'
        END::TEXT as enrollment_status,
        COALESCE(p.last_sign_in_at, p.created_at) as last_access
    FROM profiles p
    LEFT JOIN enrollments e ON p.id = e.user_id
    LEFT JOIN classes cl ON e.class_id = cl.id
    LEFT JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    WHERE 
        p.role IN ('student', 'admin', 'instructor')  -- Incluir todos os tipos de usuário
        AND (course_id_param IS NULL OR course_id_param = '' OR c.id = course_id_param::UUID)
        AND (class_id_param IS NULL OR class_id_param = '' OR cl.id = class_id_param::UUID)
        AND (segment_param IS NULL OR segment_param = '' OR cs.name ILIKE '%' || segment_param || '%')
    ORDER BY registration_date DESC, student_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION get_student_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_registered_students TO authenticated;

-- 5. Comentários para documentação
COMMENT ON FUNCTION get_student_progress IS 'Retorna alunos que não iniciaram ou têm pouco progresso no treinamento (corrigido)';
COMMENT ON FUNCTION get_registered_students IS 'Retorna todos os alunos cadastrados no sistema com informações de matrícula (corrigido)';

-- 6. Verificação das funções criadas
SELECT 'Função get_student_progress corrigida com sucesso' as status;
SELECT 'Função get_registered_students corrigida com sucesso' as status;

-- 7. Teste básico das funções
SELECT 'Testando get_student_progress...' as test_info;
SELECT COUNT(*) as total_records FROM get_student_progress();

SELECT 'Testando get_registered_students...' as test_info;
SELECT COUNT(*) as total_records FROM get_registered_students();

-- Mensagem de sucesso
SELECT 'Script executado com sucesso! Funções de relatório corrigidas.' as resultado;