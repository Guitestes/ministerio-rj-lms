-- Funções e views para sistema de relatórios avançados
-- Data: 2024
-- Descrição: Funções SQL para geração de relatórios

-- Função para relatório quantitativo de cursos, turmas, disciplinas e aulas
CREATE OR REPLACE FUNCTION get_quantitative_summary(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    origin_param VARCHAR DEFAULT NULL,
    nature_param VARCHAR DEFAULT NULL,
    period_type VARCHAR DEFAULT 'monthly' -- 'daily', 'monthly', 'annual'
)
RETURNS TABLE (
    period_label TEXT,
    total_courses BIGINT,
    total_classes BIGINT,
    total_lessons BIGINT,
    total_completed_lessons BIGINT,
    origin VARCHAR,
    nature VARCHAR
) AS $$
BEGIN
    IF period_type = 'daily' THEN
        RETURN QUERY
        WITH course_stats AS (
            SELECT 
                TO_CHAR(c.created_at::date, 'YYYY-MM-DD') as period,
                COUNT(DISTINCT c.id) as courses_count,
                COUNT(DISTINCT cl.id) as classes_count,
                COUNT(DISTINCT l.id) as lessons_count,
                COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons_count,
                COALESCE(c.origin, 'internal') as course_origin,
                COALESCE(cs.name, 'general') as course_nature
            FROM courses c
            LEFT JOIN classes cl ON c.id = cl.course_id
            LEFT JOIN modules m ON c.id = m.course_id
            LEFT JOIN lessons l ON m.id = l.module_id
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
            LEFT JOIN course_segments cs ON c.segment_id = cs.id
            WHERE 
                (start_date_param IS NULL OR start_date_param = '' OR c.created_at::date >= start_date_param::date)
                AND (end_date_param IS NULL OR end_date_param = '' OR c.created_at::date <= end_date_param::date)
                AND (origin_param IS NULL OR c.origin = origin_param)
                AND (nature_param IS NULL OR cs.name = nature_param)
            GROUP BY TO_CHAR(c.created_at::date, 'YYYY-MM-DD'), c.origin, cs.name
        )
        SELECT cs.period, COALESCE(cs.courses_count, 0), COALESCE(cs.classes_count, 0), 
               COALESCE(cs.lessons_count, 0), COALESCE(cs.completed_lessons_count, 0),
               cs.course_origin, cs.course_nature
        FROM course_stats cs ORDER BY cs.period;
    ELSIF period_type = 'monthly' THEN
        RETURN QUERY
        WITH course_stats AS (
            SELECT 
                TO_CHAR(date_trunc('month', c.created_at), 'YYYY-MM') as period,
                COUNT(DISTINCT c.id) as courses_count,
                COUNT(DISTINCT cl.id) as classes_count,
                COUNT(DISTINCT l.id) as lessons_count,
                COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons_count,
                COALESCE(c.origin, 'internal') as course_origin,
                COALESCE(cs.name, 'general') as course_nature
            FROM courses c
            LEFT JOIN classes cl ON c.id = cl.course_id
            LEFT JOIN modules m ON c.id = m.course_id
            LEFT JOIN lessons l ON m.id = l.module_id
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
            LEFT JOIN course_segments cs ON c.segment_id = cs.id
            WHERE 
                (start_date_param IS NULL OR start_date_param = '' OR c.created_at::date >= start_date_param::date)
                AND (end_date_param IS NULL OR end_date_param = '' OR c.created_at::date <= end_date_param::date)
                AND (origin_param IS NULL OR c.origin = origin_param)
                AND (nature_param IS NULL OR cs.name = nature_param)
            GROUP BY TO_CHAR(date_trunc('month', c.created_at), 'YYYY-MM'), c.origin, cs.name
        )
        SELECT cs.period, COALESCE(cs.courses_count, 0), COALESCE(cs.classes_count, 0), 
               COALESCE(cs.lessons_count, 0), COALESCE(cs.completed_lessons_count, 0),
               cs.course_origin, cs.course_nature
        FROM course_stats cs ORDER BY cs.period;
    ELSE -- annual
        RETURN QUERY
        WITH course_stats AS (
            SELECT 
                TO_CHAR(date_trunc('year', c.created_at), 'YYYY') as period,
                COUNT(DISTINCT c.id) as courses_count,
                COUNT(DISTINCT cl.id) as classes_count,
                COUNT(DISTINCT l.id) as lessons_count,
                COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons_count,
                COALESCE(c.origin, 'internal') as course_origin,
                COALESCE(cs.name, 'general') as course_nature
            FROM courses c
            LEFT JOIN classes cl ON c.id = cl.course_id
            LEFT JOIN modules m ON c.id = m.course_id
            LEFT JOIN lessons l ON m.id = l.module_id
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
            LEFT JOIN course_segments cs ON c.segment_id = cs.id
            WHERE 
                (start_date_param IS NULL OR start_date_param = '' OR c.created_at::date >= start_date_param::date)
                AND (end_date_param IS NULL OR end_date_param = '' OR c.created_at::date <= end_date_param::date)
                AND (origin_param IS NULL OR c.origin = origin_param)
                AND (nature_param IS NULL OR cs.name = nature_param)
            GROUP BY TO_CHAR(date_trunc('year', c.created_at), 'YYYY'), c.origin, cs.name
        )
        SELECT cs.period, COALESCE(cs.courses_count, 0), COALESCE(cs.classes_count, 0), 
               COALESCE(cs.lessons_count, 0), COALESCE(cs.completed_lessons_count, 0),
               cs.course_origin, cs.course_nature
        FROM course_stats cs ORDER BY cs.period;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de avaliações (aluno, professor, instituição)
CREATE OR REPLACE FUNCTION get_evaluation_results(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    evaluation_type_param VARCHAR DEFAULT NULL,
    course_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    evaluation_type VARCHAR,
    course_name TEXT,
    class_name TEXT,
    average_rating NUMERIC,
    total_evaluations BIGINT,
    rating_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ie.evaluation_type,
        c.title as course_name,
        cl.name as class_name,
        ROUND(AVG(ie.rating::numeric), 2) as average_rating,
        COUNT(*) as total_evaluations,
        jsonb_build_object(
            'rating_1', COUNT(CASE WHEN ie.rating = 1 THEN 1 END),
            'rating_2', COUNT(CASE WHEN ie.rating = 2 THEN 1 END),
            'rating_3', COUNT(CASE WHEN ie.rating = 3 THEN 1 END),
            'rating_4', COUNT(CASE WHEN ie.rating = 4 THEN 1 END),
            'rating_5', COUNT(CASE WHEN ie.rating = 5 THEN 1 END)
        ) as rating_distribution
    FROM institutional_evaluations ie
    LEFT JOIN courses c ON ie.course_id = c.id
    LEFT JOIN classes cl ON ie.class_id = cl.id
    WHERE 
        (start_date_param IS NULL OR start_date_param = '' OR ie.evaluation_date::date >= start_date_param::date)
        AND (end_date_param IS NULL OR end_date_param = '' OR ie.evaluation_date::date <= end_date_param::date)
        AND (evaluation_type_param IS NULL OR ie.evaluation_type = evaluation_type_param)
        AND (course_id_param IS NULL OR ie.course_id = course_id_param)
    GROUP BY ie.evaluation_type, c.title, cl.name
    ORDER BY ie.evaluation_type, c.title, cl.name;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de trabalhos acadêmicos
CREATE OR REPLACE FUNCTION get_academic_works_summary(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    origin_param VARCHAR DEFAULT NULL,
    nature_param VARCHAR DEFAULT NULL,
    period_type VARCHAR DEFAULT 'monthly'
)
RETURNS TABLE (
    period_label TEXT,
    total_works BIGINT,
    origin VARCHAR,
    nature VARCHAR,
    average_grade NUMERIC
) AS $$
BEGIN
    IF period_type = 'daily' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(maw.submission_date::date, 'YYYY-MM-DD') as period,
            COUNT(*) as total_works,
            maw.origin,
            maw.nature,
            ROUND(AVG(maw.grade), 2) as average_grade
        FROM moodle_academic_works maw
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR maw.submission_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR maw.submission_date::date <= end_date_param::date)
            AND (origin_param IS NULL OR maw.origin = origin_param)
            AND (nature_param IS NULL OR maw.nature = nature_param)
        GROUP BY TO_CHAR(maw.submission_date::date, 'YYYY-MM-DD'), maw.origin, maw.nature
        ORDER BY period;
    ELSIF period_type = 'monthly' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('month', maw.submission_date), 'YYYY-MM') as period,
            COUNT(*) as total_works,
            maw.origin,
            maw.nature,
            ROUND(AVG(maw.grade), 2) as average_grade
        FROM moodle_academic_works maw
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR maw.submission_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR maw.submission_date::date <= end_date_param::date)
            AND (origin_param IS NULL OR maw.origin = origin_param)
            AND (nature_param IS NULL OR maw.nature = nature_param)
        GROUP BY TO_CHAR(date_trunc('month', maw.submission_date), 'YYYY-MM'), maw.origin, maw.nature
        ORDER BY period;
    ELSE -- annual
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('year', maw.submission_date), 'YYYY') as period,
            COUNT(*) as total_works,
            maw.origin,
            maw.nature,
            ROUND(AVG(maw.grade), 2) as average_grade
        FROM moodle_academic_works maw
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR maw.submission_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR maw.submission_date::date <= end_date_param::date)
            AND (origin_param IS NULL OR maw.origin = origin_param)
            AND (nature_param IS NULL OR maw.nature = nature_param)
        GROUP BY TO_CHAR(date_trunc('year', maw.submission_date), 'YYYY'), maw.origin, maw.nature
        ORDER BY period;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de certificados
CREATE OR REPLACE FUNCTION get_certificates_summary(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    period_type VARCHAR DEFAULT 'monthly'
)
RETURNS TABLE (
    period_label TEXT,
    course_name TEXT,
    total_certificates BIGINT,
    internal_certificates BIGINT,
    moodle_certificates BIGINT
) AS $$
BEGIN
    IF period_type = 'daily' THEN
        RETURN QUERY
        WITH all_certificates AS (
            -- Certificados internos
            SELECT 
                c.issue_date,
                co.title as course_name,
                co.id as course_id,
                'internal' as origin
            FROM certificates c
            LEFT JOIN courses co ON c.course_id = co.id
            WHERE c.issue_date IS NOT NULL
            
            UNION ALL
            
            -- Certificados do Moodle
            SELECT 
                mc.issue_date,
                co.title as course_name,
                co.id as course_id,
                'moodle' as origin
            FROM moodle_certificates mc
            LEFT JOIN courses co ON mc.course_id = co.id
            WHERE mc.issue_date IS NOT NULL
        )
        SELECT 
            TO_CHAR(ac.issue_date::date, 'YYYY-MM-DD') as period,
            ac.course_name,
            COUNT(*) as total_certificates,
            COUNT(CASE WHEN ac.origin = 'internal' THEN 1 END) as internal_certificates,
            COUNT(CASE WHEN ac.origin = 'moodle' THEN 1 END) as moodle_certificates
        FROM all_certificates ac
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR ac.issue_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR ac.issue_date::date <= end_date_param::date)
            AND (course_id_param IS NULL OR ac.course_id = course_id_param)
        GROUP BY TO_CHAR(ac.issue_date::date, 'YYYY-MM-DD'), ac.course_name
        ORDER BY period, ac.course_name;
    ELSIF period_type = 'monthly' THEN
        RETURN QUERY
        WITH all_certificates AS (
            -- Certificados internos
            SELECT 
                c.issue_date,
                co.title as course_name,
                co.id as course_id,
                'internal' as origin
            FROM certificates c
            LEFT JOIN courses co ON c.course_id = co.id
            WHERE c.issue_date IS NOT NULL
            
            UNION ALL
            
            -- Certificados do Moodle
            SELECT 
                mc.issue_date,
                co.title as course_name,
                co.id as course_id,
                'moodle' as origin
            FROM moodle_certificates mc
            LEFT JOIN courses co ON mc.course_id = co.id
            WHERE mc.issue_date IS NOT NULL
        )
        SELECT 
            TO_CHAR(date_trunc('month', ac.issue_date), 'YYYY-MM') as period,
            ac.course_name,
            COUNT(*) as total_certificates,
            COUNT(CASE WHEN ac.origin = 'internal' THEN 1 END) as internal_certificates,
            COUNT(CASE WHEN ac.origin = 'moodle' THEN 1 END) as moodle_certificates
        FROM all_certificates ac
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR ac.issue_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR ac.issue_date::date <= end_date_param::date)
            AND (course_id_param IS NULL OR ac.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('month', ac.issue_date), 'YYYY-MM'), ac.course_name
        ORDER BY period, ac.course_name;
    ELSE -- annual
        RETURN QUERY
        WITH all_certificates AS (
            -- Certificados internos
            SELECT 
                c.issue_date,
                co.title as course_name,
                co.id as course_id,
                'internal' as origin
            FROM certificates c
            LEFT JOIN courses co ON c.course_id = co.id
            WHERE c.issue_date IS NOT NULL
            
            UNION ALL
            
            -- Certificados do Moodle
            SELECT 
                mc.issue_date,
                co.title as course_name,
                co.id as course_id,
                'moodle' as origin
            FROM moodle_certificates mc
            LEFT JOIN courses co ON mc.course_id = co.id
            WHERE mc.issue_date IS NOT NULL
        )
        SELECT 
            TO_CHAR(date_trunc('year', ac.issue_date), 'YYYY') as period,
            ac.course_name,
            COUNT(*) as total_certificates,
            COUNT(CASE WHEN ac.origin = 'internal' THEN 1 END) as internal_certificates,
            COUNT(CASE WHEN ac.origin = 'moodle' THEN 1 END) as moodle_certificates
        FROM all_certificates ac
        WHERE 
            (start_date_param IS NULL OR start_date_param = '' OR ac.issue_date::date >= start_date_param::date)
            AND (end_date_param IS NULL OR end_date_param = '' OR ac.issue_date::date <= end_date_param::date)
            AND (course_id_param IS NULL OR ac.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('year', ac.issue_date), 'YYYY'), ac.course_name
        ORDER BY period, ac.course_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de inscrições por cargo
CREATE OR REPLACE FUNCTION get_enrollment_by_position(
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    period_type VARCHAR DEFAULT 'monthly'
)
RETURNS TABLE (
    period_label TEXT,
    position_name TEXT,
    position_category TEXT,
    total_enrollments BIGINT,
    active_enrollments BIGINT,
    completed_enrollments BIGINT
) AS $$
BEGIN
    IF period_type = 'daily' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(e.enrolled_at::date, 'YYYY-MM-DD') as period,
            COALESCE(up.name, 'Não informado') as position_name,
            COALESCE(up.category, 'outros') as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(e.enrolled_at::date, 'YYYY-MM-DD'), up.name, up.category
        ORDER BY period, position_name;
    ELSIF period_type = 'monthly' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('month', e.enrolled_at), 'YYYY-MM') as period,
            COALESCE(up.name, 'Não informado') as position_name,
            COALESCE(up.category, 'outros') as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('month', e.enrolled_at), 'YYYY-MM'), up.name, up.category
        ORDER BY period, position_name;
    ELSE -- annual
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('year', e.enrolled_at), 'YYYY') as period,
            COALESCE(up.name, 'Não informado') as position_name,
            COALESCE(up.category, 'outros') as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('year', e.enrolled_at), 'YYYY'), up.name, up.category
        ORDER BY period, position_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View para relatórios de acompanhamento de turmas
CREATE OR REPLACE VIEW class_tracking_report AS
SELECT 
    cl.id as class_id,
    cl.name as class_name,
    c.title as course_name,
    cs.name as segment_name,
    cl.start_date,
    cl.end_date,
    cl.status as class_status,
    COUNT(DISTINCT e.user_id) as total_students,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.user_id END) as active_students,
    COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.user_id END) as completed_students,
    COUNT(DISTINCT CASE WHEN e.progress < 25 THEN e.user_id END) as not_started_students,
    COUNT(DISTINCT CASE WHEN e.progress >= 80 AND e.progress < 100 THEN e.user_id END) as near_completion_students,
    ROUND(AVG(e.progress), 2) as average_progress
FROM classes cl
LEFT JOIN courses c ON cl.course_id = c.id
LEFT JOIN course_segments cs ON c.segment_id = cs.id
LEFT JOIN enrollments e ON cl.id = e.class_id
GROUP BY cl.id, cl.name, c.title, cs.name, cl.start_date, cl.end_date, cl.status;

-- View para relatório de alunos por turma
CREATE OR REPLACE VIEW students_per_class_report AS
SELECT 
    cl.id as class_id,
    cl.name as class_name,
    c.title as course_name,
    cs.name as segment_name,
    p.full_name as student_name,
    p.email as student_email,
    up.name as position_name,
    e.enrolled_at,
    e.status as enrollment_status,
    e.progress,
    e.completed_at,
    CASE 
        WHEN e.progress < 25 THEN 'Não iniciado'
        WHEN e.progress >= 25 AND e.progress < 75 THEN 'Em andamento'
        WHEN e.progress >= 75 AND e.progress < 100 THEN 'Próximo à conclusão'
        WHEN e.progress = 100 THEN 'Concluído'
        ELSE 'Indefinido'
    END as progress_status
FROM classes cl
LEFT JOIN courses c ON cl.course_id = c.id
LEFT JOIN course_segments cs ON c.segment_id = cs.id
LEFT JOIN enrollments e ON cl.id = e.class_id
LEFT JOIN profiles p ON e.user_id = p.id
LEFT JOIN user_positions up ON p.position_id = up.id;

-- Função para relatório de gastos por curso e turma
CREATE OR REPLACE FUNCTION get_expense_report(
    course_id_param UUID DEFAULT NULL,
    class_id_param UUID DEFAULT NULL,
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    course_id UUID,
    course_name TEXT,
    class_id UUID,
    class_name TEXT,
    course_type TEXT,
    tutor_expenses NUMERIC,
    resource_expenses NUMERIC,
    total_expenses NUMERIC,
    period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as course_id,
        c.title as course_name,
        cl.id as class_id,
        cl.name as class_name,
        COALESCE(c.course_type, 'presencial') as course_type,
        COALESCE(SUM(CASE WHEN ft.description ILIKE '%tutor%' OR ft.description ILIKE '%professor%' THEN ft.amount ELSE 0 END), 0) as tutor_expenses,
        COALESCE(SUM(CASE WHEN ft.description NOT ILIKE '%tutor%' AND ft.description NOT ILIKE '%professor%' THEN ft.amount ELSE 0 END), 0) as resource_expenses,
        COALESCE(SUM(ft.amount), 0) as total_expenses,
        TO_CHAR(ft.created_at, 'YYYY-MM') as period
    FROM courses c
    LEFT JOIN classes cl ON c.id = cl.course_id
    LEFT JOIN financial_transactions ft ON (
        ft.type = 'expense' 
        AND ft.status IN ('paid', 'pending')
        AND (
            ft.description ILIKE '%' || c.title || '%' 
            OR ft.description ILIKE '%' || cl.name || '%'
            OR EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = ft.profile_id 
                AND p.id IN (
                    SELECT instructor_id FROM classes WHERE course_id = c.id
                    UNION
                    SELECT user_id FROM enrollments WHERE class_id = cl.id
                )
            )
        )
    )
    WHERE 
        (course_id_param IS NULL OR c.id = course_id_param)
        AND (class_id_param IS NULL OR cl.id = class_id_param)
        AND (
            start_date_param IS NULL 
            OR start_date_param = '' 
            OR ft.created_at IS NULL 
            OR ft.created_at::date >= start_date_param::date
        )
        AND (
            end_date_param IS NULL 
            OR end_date_param = '' 
            OR ft.created_at IS NULL 
            OR ft.created_at::date <= end_date_param::date
        )
    GROUP BY c.id, c.title, cl.id, cl.name, c.course_type, TO_CHAR(ft.created_at, 'YYYY-MM')
    ORDER BY c.title, cl.name, period;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas funções
COMMENT ON FUNCTION get_quantitative_summary IS 'Função para relatório quantitativo de cursos, turmas, disciplinas e aulas';
COMMENT ON FUNCTION get_evaluation_results IS 'Função para relatório de resultados de avaliações';
COMMENT ON FUNCTION get_academic_works_summary IS 'Função para relatório de trabalhos acadêmicos';
COMMENT ON FUNCTION get_certificates_summary IS 'Função para relatório de certificados';
COMMENT ON FUNCTION get_enrollment_by_position IS 'Função para relatório de inscrições por cargo/posição';
COMMENT ON FUNCTION get_expense_report IS 'Função para relatório de gastos por curso e turma';
COMMENT ON VIEW class_tracking_report IS 'View para acompanhamento de turmas';
COMMENT ON VIEW students_per_class_report IS 'View para relatório de alunos por turma';}]}}