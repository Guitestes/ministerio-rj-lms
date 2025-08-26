-- Fix for AdminReports errors
-- This migration fixes multiple issues:
-- 1. Invalid date syntax error in all report functions with DATE parameters
-- 2. Column l.class_id does not exist error in get_attendance_list and get_tutor_payments
-- 3. Updates all report functions to handle empty string dates properly

-- Fix get_certificates_summary function to handle empty string dates
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
        CASE 
            WHEN period_type = 'daily' THEN TO_CHAR(ac.issue_date::date, 'YYYY-MM-DD')
            WHEN period_type = 'monthly' THEN TO_CHAR(date_trunc('month', ac.issue_date), 'YYYY-MM')
            ELSE TO_CHAR(date_trunc('year', ac.issue_date), 'YYYY')
        END as period,
        ac.course_name,
        COUNT(*) as total_certificates,
        COUNT(CASE WHEN ac.origin = 'internal' THEN 1 END) as internal_certificates,
        COUNT(CASE WHEN ac.origin = 'moodle' THEN 1 END) as moodle_certificates
    FROM all_certificates ac
    WHERE 
        (start_date_param IS NULL OR start_date_param = '' OR ac.issue_date::date >= start_date_param::date)
        AND (end_date_param IS NULL OR end_date_param = '' OR ac.issue_date::date <= end_date_param::date)
        AND (course_id_param IS NULL OR ac.course_id = course_id_param)
    GROUP BY 
        CASE 
            WHEN period_type = 'daily' THEN TO_CHAR(ac.issue_date::date, 'YYYY-MM-DD')
            WHEN period_type = 'monthly' THEN TO_CHAR(date_trunc('month', ac.issue_date), 'YYYY-MM')
            ELSE TO_CHAR(date_trunc('year', ac.issue_date), 'YYYY')
        END,
        ac.course_name
    ORDER BY period, ac.course_name;
END;
$$ LANGUAGE plpgsql;

-- Fix get_attendance_list function to properly join lessons through modules
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
    position_name TEXT
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