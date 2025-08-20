-- Adiciona funções para calcular métricas avançadas de retenção de alunos.
CREATE OR REPLACE FUNCTION reports.get_retention_by_cohort()
RETURNS TABLE (
    cohort TEXT,
    total_students BIGINT,
    retained_month_1 BIGINT,
    retention_rate_month_1 NUMERIC,
    retained_month_3 BIGINT,
    retention_rate_month_3 NUMERIC,
    retained_month_6 BIGINT,
    retention_rate_month_6 NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH cohorts AS (
        -- 1. Definir os cohorts (grupos) por mês de matrícula
        SELECT
            user_id,
            -- Formata a data de matrícula para 'YYYY-MM' para agrupar por mês
            to_char(enrolled_at, 'YYYY-MM') AS cohort_month
        FROM public.enrollments
    ),
    cohort_sizes AS (
        -- 2. Calcular o tamanho de cada cohort
        SELECT
            cohort_month,
            COUNT(DISTINCT user_id) AS total_students
        FROM cohorts
        GROUP BY cohort_month
    ),
    activity AS (
        -- 3. Verificar a atividade dos alunos nos meses seguintes
        SELECT
            c.user_id,
            c.cohort_month,
            -- Verifica se o aluno ainda estava ativo X meses após a matrícula
            (
                SELECT TRUE
                FROM public.enrollments e
                WHERE e.user_id = c.user_id
                  AND e.status = 'active'
                  AND e.enrolled_at <= (to_date(c.cohort_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month')
                LIMIT 1
            ) AS active_after_1_month,
            (
                SELECT TRUE
                FROM public.enrollments e
                WHERE e.user_id = c.user_id
                  AND e.status = 'active'
                  AND e.enrolled_at <= (to_date(c.cohort_month || '-01', 'YYYY-MM-DD') + INTERVAL '3 months')
                LIMIT 1
            ) AS active_after_3_months,
            (
                SELECT TRUE
                FROM public.enrollments e
                WHERE e.user_id = c.user_id
                  AND e.status = 'active'
                  AND e.enrolled_at <= (to_date(c.cohort_month || '-01', 'YYYY-MM-DD') + INTERVAL '6 months')
                LIMIT 1
            ) AS active_after_6_months
        FROM cohorts c
    )
    -- 4. Agregar os resultados
    SELECT
        cs.cohort_month AS cohort,
        cs.total_students,
        COUNT(CASE WHEN a.active_after_1_month THEN 1 END) AS retained_month_1,
        ROUND((COUNT(CASE WHEN a.active_after_1_month THEN 1 END)::NUMERIC * 100 / cs.total_students), 2) AS retention_rate_month_1,
        COUNT(CASE WHEN a.active_after_3_months THEN 1 END) AS retained_month_3,
        ROUND((COUNT(CASE WHEN a.active_after_3_months THEN 1 END)::NUMERIC * 100 / cs.total_students), 2) AS retention_rate_month_3,
        COUNT(CASE WHEN a.active_after_6_months THEN 1 END) AS retained_month_6,
        ROUND((COUNT(CASE WHEN a.active_after_6_months THEN 1 END)::NUMERIC * 100 / cs.total_students), 2) AS retention_rate_month_6
    FROM cohort_sizes cs
    JOIN activity a ON cs.cohort_month = a.cohort_month
    GROUP BY cs.cohort_month, cs.total_students
    ORDER BY cs.cohort_month DESC;

END;
$$;

GRANT EXECUTE ON FUNCTION reports.get_retention_by_cohort() TO authenticated;
