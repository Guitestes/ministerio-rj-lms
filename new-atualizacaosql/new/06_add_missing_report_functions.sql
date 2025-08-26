-- Script para adicionar funções de relatório faltantes
-- Criado para resolver erro "Tipo de relatório não implementado"

-- 1. Função para Acompanhamento Discente (alunos que não iniciaram o treinamento)
CREATE OR REPLACE FUNCTION get_student_progress(
    course_id_param TEXT DEFAULT NULL,
    class_id_param TEXT DEFAULT NULL,
    segment_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id TEXT,
    student_name TEXT,
    student_email TEXT,
    course_name TEXT,
    class_name TEXT,
    enrollment_date DATE,
    progress_percentage NUMERIC,
    status TEXT,
    last_access TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.student_id::TEXT,
        COALESCE(p.name, 'Não informado')::TEXT as student_name,
        COALESCE(p.email, 'Não informado')::TEXT as student_email,
        COALESCE(c.title, 'Não informado')::TEXT as course_name,
        COALESCE(cl.name, 'Não informado')::TEXT as class_name,
        e.enrollment_date,
        COALESCE(e.progress_percentage, 0) as progress_percentage,
        CASE 
            WHEN COALESCE(e.progress_percentage, 0) = 0 THEN 'Não iniciado'
            WHEN COALESCE(e.progress_percentage, 0) < 25 THEN 'Iniciado'
            WHEN COALESCE(e.progress_percentage, 0) < 75 THEN 'Em progresso'
            WHEN COALESCE(e.progress_percentage, 0) < 100 THEN 'Quase concluído'
            ELSE 'Concluído'
        END::TEXT as status,
        COALESCE(au.last_sign_in_at, e.enrollment_date::TIMESTAMP) as last_access
    FROM enrollments e
    LEFT JOIN profiles p ON e.student_id = p.id
    LEFT JOIN auth.users au ON e.student_id = au.id
    LEFT JOIN classes cl ON e.class_id = cl.id
    LEFT JOIN courses c ON cl.course_id = c.id
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (segment_param IS NULL OR c.segment_name = segment_param)
        AND COALESCE(e.progress_percentage, 0) < 25  -- Foco em alunos que não iniciaram ou iniciaram pouco
    ORDER BY e.enrollment_date DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para Alunos Cadastrados (todos os alunos cadastrados no sistema)
CREATE OR REPLACE FUNCTION get_registered_students(
    course_id_param TEXT DEFAULT NULL,
    class_id_param TEXT DEFAULT NULL,
    segment_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id TEXT,
    student_name TEXT,
    student_email TEXT,
    student_role TEXT,
    registration_date TIMESTAMP,
    course_name TEXT,
    class_name TEXT,
    enrollment_status TEXT,
    last_access TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.id::TEXT as student_id,
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
        COALESCE(au.last_sign_in_at, p.created_at) as last_access
    FROM profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    LEFT JOIN enrollments e ON p.id = e.student_id
    LEFT JOIN classes cl ON e.class_id = cl.id
    LEFT JOIN courses c ON cl.course_id = c.id
    WHERE 
        p.role IN ('student', 'admin', 'instructor')  -- Incluir todos os tipos de usuário
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (segment_param IS NULL OR c.segment_name = segment_param)
    ORDER BY p.created_at DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION get_student_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_registered_students TO authenticated;

-- 4. Comentários para documentação
COMMENT ON FUNCTION get_student_progress IS 'Retorna alunos que não iniciaram ou têm pouco progresso no treinamento';
COMMENT ON FUNCTION get_registered_students IS 'Retorna todos os alunos cadastrados no sistema com informações de matrícula';

-- 5. Verificação das funções criadas
SELECT 'Função get_student_progress criada com sucesso' as status;
SELECT 'Função get_registered_students criada com sucesso' as status;