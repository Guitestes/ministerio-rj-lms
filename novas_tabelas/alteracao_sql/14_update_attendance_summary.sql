-- Altera a função de relatório de frequência para incluir mais estatísticas detalhadas.
CREATE OR REPLACE FUNCTION reports.get_student_attendance_summary(
    class_id_param UUID
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    total_events BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    justified_absence_count BIGINT,
    attendance_rate NUMERIC,
    absence_rate NUMERIC,
    justified_absence_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH attendance_counts AS (
        SELECT
            ca.user_id,
            COUNT(*) AS total_events,
            COUNT(*) FILTER (WHERE ca.status = 'presente') AS present_count,
            COUNT(*) FILTER (WHERE ca.status = 'ausente') AS absent_count,
            COUNT(*) FILTER (WHERE ca.status = 'ausente_justificado') AS justified_absence_count
        FROM
            public.class_attendance AS ca
        WHERE
            ca.class_id = class_id_param
        GROUP BY
            ca.user_id
    )
    SELECT
        ac.user_id,
        p.name AS user_name,
        ac.total_events,
        ac.present_count,
        ac.absent_count,
        ac.justified_absence_count,
        -- Taxa de presença é (presentes / (total - justificadas)) * 100
        CASE
            WHEN (ac.total_events - ac.justified_absence_count) > 0
            THEN ROUND((ac.present_count::NUMERIC * 100 / (ac.total_events - ac.justified_absence_count)), 2)
            ELSE 0
        END AS attendance_rate,
        -- Taxa de ausência é (ausentes / total) * 100
        CASE
            WHEN ac.total_events > 0
            THEN ROUND((ac.absent_count::NUMERIC * 100 / ac.total_events), 2)
            ELSE 0
        END AS absence_rate,
        -- Taxa de ausência justificada é (justificadas / total) * 100
        CASE
            WHEN ac.total_events > 0
            THEN ROUND((ac.justified_absence_count::NUMERIC * 100 / ac.total_events), 2)
            ELSE 0
        END AS justified_absence_rate
    FROM
        attendance_counts ac
    JOIN
        public.profiles p ON ac.user_id = p.id;
END;
$$;

-- Grant execute permissions if they haven't been granted already for the altered function
GRANT EXECUTE ON FUNCTION reports.get_student_attendance_summary(UUID) TO authenticated;
