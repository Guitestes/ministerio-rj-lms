-- Funções de relatório ausentes
-- Data: 2024
-- Descrição: Criação das funções get_statistical_report e get_training_hours_report

-- Função para relatório estatístico geral
CREATE OR REPLACE FUNCTION get_statistical_report(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    period TEXT,
    total_students BIGINT,
    total_courses BIGINT,
    total_classes BIGINT,
    active_students BIGINT,
    completed_courses BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT 
            CASE 
                WHEN start_date_param IS NOT NULL AND end_date_param IS NOT NULL THEN
                    start_date_param || ' - ' || end_date_param
                ELSE 'Todos os períodos'
            END as period_label
    ),
    student_stats AS (
        SELECT 
            COUNT(DISTINCT p.id) as total_students_count,
            COUNT(DISTINCT CASE WHEN e.status = 'active' THEN p.id END) as active_students_count
        FROM profiles p
        LEFT JOIN enrollments e ON p.id = e.user_id
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR e.enrolled_at::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR e.enrolled_at::date <= end_date_param::date)
    ),
    course_stats AS (
        SELECT 
            COUNT(DISTINCT c.id) as total_courses_count,
            COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN c.id END) as completed_courses_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR c.created_at::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR c.created_at::date <= end_date_param::date)
    ),
    class_stats AS (
        SELECT 
            COUNT(DISTINCT cl.id) as total_classes_count
        FROM classes cl
        JOIN courses c ON cl.course_id = c.id
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR cl.created_at::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR cl.created_at::date <= end_date_param::date)
    )
    SELECT 
        dr.period_label,
        ss.total_students_count,
        cs.total_courses_count,
        cls.total_classes_count,
        ss.active_students_count,
        cs.completed_courses_count
    FROM date_range dr
    CROSS JOIN student_stats ss
    CROSS JOIN course_stats cs
    CROSS JOIN class_stats cls;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de horas de treinamento
CREATE OR REPLACE FUNCTION get_training_hours_report(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    student_id_param UUID DEFAULT NULL,
    course_type_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    course_id UUID,
    course_name TEXT,
    course_type TEXT,
    total_hours NUMERIC,
    completed_hours NUMERIC,
    progress_percentage NUMERIC,
    period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        c.id as course_id,
        c.title as course_name,
        COALESCE(c.course_type, 'presencial') as course_type,
        COALESCE(c.workload_hours, 0)::NUMERIC as total_hours,
        ROUND((COALESCE(c.workload_hours, 0) * e.progress / 100), 2) as completed_hours,
        e.progress::numeric as progress_percentage,
        TO_CHAR(e.enrolled_at, 'YYYY-MM') as period
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN courses c ON e.course_id = c.id
    WHERE 
        (start_date_param IS NULL OR start_date_param = '' OR e.enrolled_at::date >= start_date_param::date)
        AND (end_date_param IS NULL OR end_date_param = '' OR e.enrolled_at::date <= end_date_param::date)
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (student_id_param IS NULL OR p.id = student_id_param)
        AND (course_type_param IS NULL OR COALESCE(c.course_type, 'presencial') = course_type_param)
    ORDER BY p.full_name, c.title;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas funções
COMMENT ON FUNCTION get_statistical_report IS 'Função para relatório estatístico geral do sistema';
COMMENT ON FUNCTION get_training_hours_report IS 'Função para relatório de horas de treinamento por aluno e curso';

-- Verificar se as funções foram criadas com sucesso
SELECT 
    'get_statistical_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_statistical_report'
    ) THEN 'CRIADA' ELSE 'ERRO' END as status
UNION ALL
SELECT 
    'get_training_hours_report' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_training_hours_report'
    ) THEN 'CRIADA' ELSE 'ERRO' END as status;

SELECT 'Funções de relatório criadas com sucesso!' as message;