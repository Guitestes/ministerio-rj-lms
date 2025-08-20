-- Altera a função de verificação de baixa frequência para também enviar uma notificação ao usuário.
CREATE OR REPLACE FUNCTION public.check_low_attendance()
RETURNS void AS $$
DECLARE
    class_record RECORD;
    student_record RECORD;
    v_class_name TEXT;
    v_course_title TEXT;
    attendance_threshold NUMERIC := 75.0; -- Limite de 75%
BEGIN
    -- Itera sobre todas as turmas ativas
    FOR class_record IN
        SELECT id, name, course_id FROM public.classes WHERE end_date IS NULL OR end_date >= CURRENT_DATE
    LOOP
        -- Obtém o nome do curso para a mensagem de notificação
        SELECT title INTO v_course_title FROM public.courses WHERE id = class_record.course_id;
        v_class_name := v_course_title || ' - ' || class_record.name;

        -- Para cada turma, obtém o resumo de frequência dos alunos
        FOR student_record IN
            SELECT * FROM reports.get_student_attendance_summary(class_record.id)
        LOOP
            -- Verifica se a taxa de presença está abaixo do limite
            IF student_record.attendance_rate < attendance_threshold THEN
                -- Verifica se já existe um alerta para este aluno, nesta turma, no dia de hoje
                IF NOT EXISTS (
                    SELECT 1
                    FROM public.low_attendance_alerts
                    WHERE user_id = student_record.user_id
                      AND class_id = class_record.id
                      AND alert_date = CURRENT_DATE
                ) THEN
                    -- 1. Insere o registro de alerta para evitar duplicatas
                    INSERT INTO public.low_attendance_alerts (user_id, class_id, attendance_rate)
                    VALUES (student_record.user_id, class_record.id, student_record.attendance_rate);

                    -- 2. Insere a notificação para o usuário
                    INSERT INTO public.notifications (user_id, message, type, link)
                    VALUES (
                        student_record.user_id,
                        'Atenção: Sua frequência na turma "' || v_class_name || '" está em ' || ROUND(student_record.attendance_rate, 2) || '%, abaixo do mínimo recomendado. Regularize sua situação.',
                        'low_attendance_alert',
                        '/aluno/my-courses' -- Link genérico para a página de cursos do aluno
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- O agendamento via pg_cron já deve existir, esta função apenas o substitui.
-- Não é necessário reagendar.
COMMENT ON FUNCTION public.check_low_attendance() IS 'Verifica diariamente alunos com baixa frequência (abaixo de 75%), registra um alerta e envia uma notificação ao usuário.';
