-- Adiciona uma função para análise preditiva de evasão, calculando um "índice de risco".
CREATE OR REPLACE FUNCTION reports.get_student_risk_profile(
    p_class_id UUID
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    risk_score NUMERIC,
    attendance_rate NUMERIC,
    average_grade NUMERIC,
    days_since_last_activity BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Pesos para cada fator de risco
    attendance_weight NUMERIC := 0.4;
    grade_weight NUMERIC := 0.3;
    inactivity_weight NUMERIC := 0.3;
BEGIN
    RETURN QUERY
    WITH
    student_attendance AS (
        -- 1. Obter dados de frequência
        SELECT sa.user_id, sa.user_name, sa.attendance_rate
        FROM reports.get_student_attendance_summary(p_class_id) sa
    ),
    student_grades AS (
        -- 2. Obter média das notas de quizzes
        SELECT
            qa.user_id,
            AVG(qa.score) AS average_grade
        FROM public.quiz_attempts qa
        JOIN public.quizzes q ON qa.quiz_id = q.id
        JOIN public.classes cl ON q.course_id = cl.course_id
        WHERE cl.id = p_class_id
        GROUP BY qa.user_id
    ),
    student_activity AS (
        -- 3. Obter a última data de atividade (conclusão de aula)
        SELECT
            lp.user_id,
            MAX(lp.completed_at) AS last_completion_date
        FROM public.lesson_progress lp
        JOIN public.lessons l ON lp.lesson_id = l.id
        JOIN public.modules m ON l.module_id = m.id
        JOIN public.classes cl ON m.course_id = cl.course_id
        WHERE cl.id = p_class_id
        GROUP BY lp.user_id
    )
    -- 4. Calcular o índice de risco
    SELECT
        sa.user_id,
        sa.user_name,
        -- Cálculo final do Score de Risco
        ROUND(
            (
                -- Inverte a taxa de frequência (quanto menor a frequência, maior o risco)
                (100 - sa.attendance_rate) * attendance_weight
            ) +
            (
                -- Inverte a média das notas (quanto menor a nota, maior o risco)
                (100 - COALESCE(sg.average_grade, 100)) * grade_weight
            ) +
            (
                -- Normaliza os dias de inatividade (máximo de 30 dias para o cálculo)
                (LEAST(EXTRACT(DAY FROM (NOW() - COALESCE(sact.last_completion_date, NOW()))), 30) * 100 / 30) * inactivity_weight
            )
        , 2) AS risk_score,
        sa.attendance_rate,
        COALESCE(sg.average_grade, 0) AS average_grade,
        EXTRACT(DAY FROM (NOW() - sact.last_completion_date)) AS days_since_last_activity
    FROM
        student_attendance sa
    LEFT JOIN
        student_grades sg ON sa.user_id = sg.user_id
    LEFT JOIN
        student_activity sact ON sa.user_id = sact.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reports.get_student_risk_profile(UUID) TO authenticated;
