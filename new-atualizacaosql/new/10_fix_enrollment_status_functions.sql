-- PARTE 2: Script para corrigir funções que usam o enum enrollment_status
-- Este script deve ser executado APÓS o 09_fix_enrollment_status_enum.sql
-- e após um COMMIT da transação anterior

-- Corrigir a função get_dropout_students para usar valores válidos do enum
-- Primeiro removemos qualquer versão existente da função
DROP FUNCTION IF EXISTS get_dropout_students;

CREATE OR REPLACE FUNCTION get_dropout_students(
    class_id_param UUID DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    class_name TEXT,
    course_name TEXT,
    enrollment_date DATE,
    last_access_date DATE,
    days_since_last_access INTEGER,
    progress_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        c.name as class_name,
        co.title as course_name,
        e.enrolled_at::DATE as enrollment_date,
        u.last_sign_in_at::DATE as last_access_date,
        CASE 
            WHEN u.last_sign_in_at IS NOT NULL THEN 
                (CURRENT_DATE - u.last_sign_in_at::DATE)::INTEGER
            ELSE NULL
        END as days_since_last_access,
        COALESCE(e.progress, 0) as progress_percentage
    FROM enrollments e
    JOIN profiles u ON e.user_id = u.id
    JOIN classes c ON e.class_id = c.id
    JOIN courses co ON c.course_id = co.id
    WHERE 
        e.status IN ('active', 'inactive') -- Apenas estudantes que não completaram ou cancelaram
        AND (
            u.last_sign_in_at IS NULL 
            OR u.last_sign_in_at < CURRENT_DATE - INTERVAL '30 days'
        )
        AND (class_id_param IS NULL OR e.class_id = class_id_param)
        AND (course_id_param IS NULL OR c.course_id = course_id_param)
        AND (start_date_param IS NULL OR e.enrolled_at::DATE >= start_date_param)
        AND (end_date_param IS NULL OR e.enrolled_at::DATE <= end_date_param)
    ORDER BY 
        days_since_last_access DESC NULLS LAST,
        e.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Criar view para mapear status de enrollment corretamente
CREATE OR REPLACE VIEW student_enrollment_status AS
SELECT 
    e.id as enrollment_id,
    e.user_id,
    e.class_id,
    u.name as student_name,
    c.name as class_name,
    co.title as course_name,
    e.enrolled_at as enrollment_date,
    e.progress,
    e.completed_at,
    u.last_sign_in_at as last_access_at,
    CASE 
        WHEN e.completed_at IS NOT NULL THEN 'completed'::enrollment_status
        WHEN e.status = 'cancelled' THEN 'cancelled'::enrollment_status
        WHEN e.status = 'withdrawn' THEN 'withdrawn'::enrollment_status
        WHEN e.status = 'locked' THEN 'locked'::enrollment_status
        WHEN e.status = 'inactive' THEN 'inactive'::enrollment_status
        ELSE 'active'::enrollment_status
    END as enrollment_status
FROM enrollments e
JOIN profiles u ON e.user_id = u.id
JOIN classes c ON e.class_id = c.id
JOIN courses co ON c.course_id = co.id;

-- Configurar permissões
GRANT SELECT ON student_enrollment_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_dropout_students TO authenticated;

-- Teste básico
DO $$
BEGIN
    RAISE NOTICE 'Testando função get_dropout_students...';
    PERFORM get_dropout_students();
    RAISE NOTICE 'Função get_dropout_students corrigida com sucesso!';
END
$$;

DO $$
BEGIN
    RAISE NOTICE 'Testando view student_enrollment_status...';
    PERFORM * FROM student_enrollment_status LIMIT 1;
    RAISE NOTICE 'View student_enrollment_status criada com sucesso!';
END
$$;