-- Evolução do Requisito 1: Alertas Automáticos de Baixa Frequência
-- Este script cria os componentes de banco de dados necessários para
-- calcular percentuais de presença e gerar alertas automáticos.

-- 1. Tabela para armazenar alertas de baixa frequência
-- Guarda um registro de cada alerta para evitar duplicatas.
CREATE TABLE public.low_attendance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    attendance_rate NUMERIC(5, 2) NOT NULL,
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unique_alert_per_day UNIQUE (user_id, class_id, alert_date)
);

ALTER TABLE public.low_attendance_alerts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.low_attendance_alerts IS 'Registra alertas gerados para alunos com baixa frequência em uma turma.';
COMMENT ON COLUMN public.low_attendance_alerts.attendance_rate IS 'Percentual de frequência do aluno no momento do alerta.';
COMMENT ON COLUMN public.low_attendance_alerts.alert_date IS 'Data em que o alerta foi gerado, para controle diário.';

-- 2. Função para verificar e registrar baixa frequência
CREATE OR REPLACE FUNCTION public.check_low_attendance()
RETURNS void AS $$
DECLARE
    class_record RECORD;
    student_record RECORD;
    attendance_threshold NUMERIC := 75.0; -- Limite de 75%
BEGIN
    -- Itera sobre todas as turmas ativas (que ainda não terminaram)
    FOR class_record IN
        SELECT id FROM public.classes WHERE end_date IS NULL OR end_date >= CURRENT_DATE
    LOOP
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
                    -- Se não houver alerta hoje, insere um novo registro
                    INSERT INTO public.low_attendance_alerts (user_id, class_id, attendance_rate)
                    VALUES (student_record.user_id, class_record.id, student_record.attendance_rate);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_low_attendance() IS 'Verifica diariamente alunos com baixa frequência e registra um alerta. Limite de frequência fixado em 75%.';

-- 3. Agendamento do Cron Job com pg_cron
-- Agenda a função para ser executada todos os dias à 01:00 (UTC).
-- Este horário é escolhido para rodar após outras rotinas diárias, como a de evasão.
SELECT cron.schedule(
    'daily-low-attendance-check', -- Nome do job
    '0 1 * * *',                  -- Executa à 01:00 todos os dias
    $$
    SELECT public.check_low_attendance();
    $$
);

-- Para remover o agendamento (se necessário):
-- SELECT cron.unschedule('daily-low-attendance-check');
