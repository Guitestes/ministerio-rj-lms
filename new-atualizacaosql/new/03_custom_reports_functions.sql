-- Funções para relatórios personalizados específicos
-- Data: 2024
-- Descrição: Funções SQL para relatórios customizados conforme requisitos

-- Remove todas as versões existentes das funções para evitar conflitos de tipo
-- Remover todas as versões possíveis da função get_dropout_students
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_dropout_students'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_dropout_students(UUID, UUID, VARCHAR, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS get_dropout_students(UUID, UUID, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_dropout_students(character varying, character varying, character varying, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_dropout_students(uuid, uuid, character varying, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_dropout_students(uuid, uuid, date, date) CASCADE;

-- Remover todas as versões possíveis da função get_trained_students_by_period
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
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(character varying, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period() CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_trained_students_by_period(TEXT, TEXT, TEXT) CASCADE;

-- Remover todas as versões possíveis da função get_students_near_completion
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_students_near_completion'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_students_near_completion(UUID, UUID, VARCHAR, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS get_students_near_completion(uuid, uuid, character varying, numeric, numeric) CASCADE;

-- Remover todas as versões possíveis da função get_final_grades_report
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_final_grades_report'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_final_grades_report(UUID, UUID, VARCHAR, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_final_grades_report(uuid, uuid, character varying, character varying, character varying) CASCADE;

-- Remover todas as versões possíveis da função get_workload_by_class
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_workload_by_class'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_workload_by_class(UUID, UUID, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_workload_by_class(uuid, uuid, character varying, character varying) CASCADE;

-- Remover todas as versões possíveis da função get_certification_report
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_certification_report'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_certification_report(UUID, VARCHAR, DATE, DATE, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_certification_report(uuid, character varying, date, date, character varying) CASCADE;

-- Remover todas as versões possíveis da função get_attendance_list
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_attendance_list'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_attendance_list(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_attendance_list(uuid, uuid) CASCADE;

-- Remover todas as versões possíveis da função get_tutor_payments
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'get_tutor_payments'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP;
END
$$;

DROP FUNCTION IF EXISTS get_tutor_payments(UUID, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_tutor_payments(uuid, uuid, uuid, character varying, character varying) CASCADE;

-- Função para relatório de alunos desistentes
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
    position_name VARCHAR(100)
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
        e.progress as progress_percentage,
        p.last_sign_in_at as last_access,
        up.name as position_name
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

-- Função para relatório de alunos treinados por período
CREATE OR REPLACE FUNCTION get_trained_students_by_period(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    period_type VARCHAR DEFAULT 'trimester' -- 'trimester', 'semester'
)
RETURNS TABLE (
    period_label TEXT,
    student_id UUID,
    student_name TEXT,
    completed_courses BIGINT,
    total_hours NUMERIC,
    position_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    WITH period_boundaries AS (
        SELECT 
            CASE 
                WHEN period_type = 'trimester' THEN 
                    EXTRACT(YEAR FROM e.completed_at)::text || '-T' || 
                    CASE 
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 3 THEN '1'
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 6 THEN '2'
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 9 THEN '3'
                        ELSE '4'
                    END
                ELSE 
                    EXTRACT(YEAR FROM e.completed_at)::text || '-S' || 
                    CASE 
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 6 THEN '1'
                        ELSE '2'
                    END
            END as period,
            p.id as student_id,
            p.full_name as student_name,
            COUNT(*) as completed_courses,
            SUM(COALESCE(c.workload_hours, 0)) as total_hours,
            up.name as position_name
        FROM enrollments e
        JOIN profiles p ON e.user_id = p.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            e.completed_at IS NOT NULL
            AND e.completed_at IS NOT NULL
            AND (start_date_param IS NULL OR e.completed_at::date >= start_date_param::date)
            AND (end_date_param IS NULL OR e.completed_at::date <= end_date_param::date)
        GROUP BY 
            CASE 
                WHEN period_type = 'trimester' THEN 
                    EXTRACT(YEAR FROM e.completed_at)::text || '-T' || 
                    CASE 
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 3 THEN '1'
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 6 THEN '2'
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 9 THEN '3'
                        ELSE '4'
                    END
                ELSE 
                    EXTRACT(YEAR FROM e.completed_at)::text || '-S' || 
                    CASE 
                        WHEN EXTRACT(MONTH FROM e.completed_at) <= 6 THEN '1'
                        ELSE '2'
                    END
            END,
            p.id,
            p.full_name,
            up.name
    )
    SELECT * FROM period_boundaries
    ORDER BY period_label, student_name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de alunos em fase de conclusão
CREATE OR REPLACE FUNCTION get_students_near_completion(
    class_id_param UUID DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    segment_param VARCHAR DEFAULT NULL,
    min_progress NUMERIC DEFAULT 80.0,
    max_progress NUMERIC DEFAULT 99.0
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    class_name TEXT,
    course_name TEXT,
    segment_name VARCHAR(100),
    progress_percentage NUMERIC,
    remaining_percentage NUMERIC,
    estimated_completion_date DATE,
    position_name VARCHAR(100)
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
        e.progress::NUMERIC as progress_percentage,
        (100 - e.progress)::NUMERIC as remaining_percentage,
        CASE 
            WHEN cl.end_date IS NOT NULL THEN cl.end_date::DATE
            ELSE (CURRENT_DATE + INTERVAL '30 days')::DATE
        END as estimated_completion_date,
        up.name as position_name
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN classes cl ON e.class_id = cl.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    LEFT JOIN user_positions up ON p.position_id = up.id
    WHERE 
        e.progress >= min_progress
        AND e.progress <= max_progress
        AND e.status = 'active'
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (segment_param IS NULL OR cs.name = segment_param)
    ORDER BY e.progress DESC, p.full_name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de notas finais
CREATE OR REPLACE FUNCTION get_final_grades_report(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    segment_param VARCHAR DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    course_name TEXT,
    class_name TEXT,
    segment_name VARCHAR(100),
    final_grade NUMERIC,
    grade_status TEXT,
    completion_date TIMESTAMP WITH TIME ZONE,
    position_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        c.title as course_name,
        cl.name as class_name,
        cs.name as segment_name,
        COALESCE((
            SELECT AVG(qa.score)
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = p.id AND q.course_id = c.id
        ), 0) as final_grade,
        CASE 
            WHEN COALESCE((
                SELECT AVG(qa.score)
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quiz_id = q.id
                WHERE qa.user_id = p.id AND q.course_id = c.id
            ), 0) >= 70 THEN 'Aprovado'
            WHEN COALESCE((
                SELECT AVG(qa.score)
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quiz_id = q.id
                WHERE qa.user_id = p.id AND q.course_id = c.id
            ), 0) >= 50 THEN 'Recuperação'
            ELSE 'Reprovado'
        END as grade_status,
        e.completed_at as completion_date,
        up.name as position_name
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN classes cl ON e.class_id = cl.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    LEFT JOIN user_positions up ON p.position_id = up.id
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (segment_param IS NULL OR cs.name = segment_param)
        AND (start_date_param IS NULL OR start_date_param = '' OR e.enrolled_at::date >= start_date_param::date)
        AND (end_date_param IS NULL OR end_date_param = '' OR e.enrolled_at::date <= end_date_param::date)
    ORDER BY final_grade DESC, p.full_name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de carga horária por turma
CREATE OR REPLACE FUNCTION get_workload_by_class(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    segment_param VARCHAR DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    class_id UUID,
    class_name TEXT,
    course_name TEXT,
    segment_name VARCHAR(100),
    total_students BIGINT,
    course_workload_hours NUMERIC,
    total_workload_hours NUMERIC,
    average_progress NUMERIC,
    class_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id as class_id,
        cl.name as class_name,
        c.title as course_name,
        cs.name as segment_name,
        COUNT(DISTINCT e.user_id) as total_students,
        COALESCE(c.workload_hours, 0) as course_workload_hours,
        (COUNT(DISTINCT e.user_id) * COALESCE(c.workload_hours, 0)) as total_workload_hours,
        ROUND(AVG(e.progress), 2) as average_progress,
        cl.status as class_status
    FROM classes cl
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN course_segments cs ON c.segment_id = cs.id
    LEFT JOIN enrollments e ON cl.id = e.class_id
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (segment_param IS NULL OR cs.name = segment_param)
        AND (status_param IS NULL OR cl.status = status_param)
    GROUP BY cl.id, cl.name, c.title, cs.name, c.workload_hours, cl.status
    ORDER BY c.title, cl.name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de certificação
CREATE OR REPLACE FUNCTION get_certification_report(
    course_id_param UUID DEFAULT NULL,
    segment_param VARCHAR DEFAULT NULL,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    course_name TEXT,
    segment_name VARCHAR(100),
    total_enrolled BIGINT,
    total_completed BIGINT,
    total_certified BIGINT,
    certification_percentage NUMERIC,
    completion_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH course_stats AS (
        SELECT 
            c.id as course_id,
            c.title as course_name,
            cs.name as segment_name,
            COUNT(DISTINCT e.user_id) as total_enrolled,
            COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.user_id END) as total_completed,
            COUNT(DISTINCT cert.user_id) + COUNT(DISTINCT mc.user_id) as total_certified
        FROM courses c
        LEFT JOIN course_segments cs ON c.segment_id = cs.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN certificates cert ON c.id = cert.course_id AND 
            (start_date_param IS NULL OR cert.issue_date::date >= start_date_param) AND
            (end_date_param IS NULL OR cert.issue_date::date <= end_date_param)
        LEFT JOIN moodle_certificates mc ON c.id = mc.course_id AND
            (start_date_param IS NULL OR mc.issue_date::date >= start_date_param) AND
            (end_date_param IS NULL OR mc.issue_date::date <= end_date_param)
        WHERE 
            (course_id_param IS NULL OR c.id = course_id_param)
            AND (segment_param IS NULL OR cs.name = segment_param)
            AND (status_param IS NULL OR c.status = status_param)
        GROUP BY c.id, c.title, cs.name
    )
    SELECT 
        cs.course_name,
        cs.segment_name,
        cs.total_enrolled,
        cs.total_completed,
        cs.total_certified,
        CASE 
            WHEN cs.total_enrolled > 0 THEN ROUND((cs.total_certified::numeric / cs.total_enrolled::numeric) * 100, 2)
            ELSE 0
        END as certification_percentage,
        CASE 
            WHEN cs.total_enrolled > 0 THEN ROUND((cs.total_completed::numeric / cs.total_enrolled::numeric) * 100, 2)
            ELSE 0
        END as completion_percentage
    FROM course_stats cs
    ORDER BY cs.course_name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de lista de presença
CREATE OR REPLACE FUNCTION get_attendance_list(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_email TEXT,
    course_name TEXT,
    class_name TEXT,
    enrollment_date TIMESTAMP WITH TIME ZONE,
    attendance_percentage NUMERIC,
    total_lessons BIGINT,
    attended_lessons BIGINT,
    position_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        p.email as student_email,
        c.title as course_name,
        cl.name as class_name,
        e.enrolled_at as enrollment_date,
        CASE 
            WHEN COUNT(l.id) > 0 THEN ROUND((COUNT(ca.id)::numeric / COUNT(l.id)::numeric) * 100, 2)
            ELSE 0
        END as attendance_percentage,
        COUNT(l.id) as total_lessons,
        COUNT(ca.id) as attended_lessons,
        up.name as position_name
    FROM enrollments e
    JOIN profiles p ON e.user_id = p.id
    JOIN classes cl ON e.class_id = cl.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN modules m ON cl.course_id = m.course_id
    LEFT JOIN lessons l ON m.id = l.module_id
    LEFT JOIN class_attendance ca ON e.class_id = ca.class_id AND ca.user_id = p.id AND ca.status = 'presente'
    LEFT JOIN user_positions up ON p.position_id = up.id
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
    GROUP BY p.id, p.full_name, p.email, c.title, cl.name, e.enrolled_at, up.name
     ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de pagamento de tutores
CREATE OR REPLACE FUNCTION get_tutor_payments(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    tutor_id_param UUID DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    tutor_id UUID,
    tutor_name TEXT,
    course_name TEXT,
    class_name TEXT,
    total_lessons BIGINT,
    total_evaluations BIGINT,
    lesson_payment NUMERIC,
    evaluation_payment NUMERIC,
    total_payment NUMERIC,
    period_start DATE,
    period_end DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as tutor_id,
        p.full_name as tutor_name,
        c.title as course_name,
        cl.name as class_name,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT q.id) as total_evaluations,
        (COUNT(DISTINCT l.id) * COALESCE(spl.lesson_price, 0)) as lesson_payment,
        (COUNT(DISTINCT q.id) * COALESCE(spl.evaluation_price, 0)) as evaluation_payment,
        ((COUNT(DISTINCT l.id) * COALESCE(spl.lesson_price, 0)) + 
         (COUNT(DISTINCT q.id) * COALESCE(spl.evaluation_price, 0))) as total_payment,
        COALESCE(start_date_param, DATE_TRUNC('month', CURRENT_DATE)::date) as period_start,
        COALESCE(end_date_param, CURRENT_DATE) as period_end
    FROM profiles p
    JOIN classes cl ON cl.instructor_id = p.id
    JOIN courses c ON cl.course_id = c.id
    LEFT JOIN modules m ON cl.course_id = m.course_id
    LEFT JOIN lessons l ON m.id = l.module_id AND 
        (start_date_param IS NULL OR start_date_param = '' OR l.created_at::date >= start_date_param::date) AND
        (end_date_param IS NULL OR end_date_param = '' OR l.created_at::date <= end_date_param::date)
    LEFT JOIN quizzes q ON c.id = q.course_id AND q.created_by = p.id AND
        (start_date_param IS NULL OR start_date_param = '' OR q.created_at::date >= start_date_param::date) AND
        (end_date_param IS NULL OR end_date_param = '' OR q.created_at::date <= end_date_param::date)
    LEFT JOIN service_price_list spl ON spl.service_type = 'tutoring'
    WHERE 
        p.role = 'professor'
        AND (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (tutor_id_param IS NULL OR p.id = tutor_id_param)
    GROUP BY p.id, p.full_name, c.title, cl.name, spl.lesson_price, spl.evaluation_price
     ORDER BY p.full_name, c.title;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas funções
COMMENT ON FUNCTION get_dropout_students IS 'Função para relatório de alunos desistentes';
COMMENT ON FUNCTION get_trained_students_by_period IS 'Função para relatório de alunos treinados por período';
COMMENT ON FUNCTION get_students_near_completion IS 'Função para relatório de alunos em fase de conclusão';
COMMENT ON FUNCTION get_final_grades_report IS 'Função para relatório de notas finais';
COMMENT ON FUNCTION get_workload_by_class IS 'Função para relatório de carga horária por turma';
COMMENT ON FUNCTION get_certification_report IS 'Função para relatório de certificação';
COMMENT ON FUNCTION get_attendance_list IS 'Função para relatório de lista de presença';
COMMENT ON FUNCTION get_tutor_payments IS 'Função para relatório de pagamento de tutores';