-- Fase 1: Backend - Lógica de Evasão Automática
-- Este script cria uma função para identificar e marcar alunos como evadidos (inativos)
-- e agenda a sua execução diária através de um Cron Job no Supabase.

-- 1. Função para atualizar o status de alunos evadidos
-- A lógica considera um aluno como evadido se a sua matrícula estiver 'active',
-- mas o seu último login (last_sign_in_at da tabela auth.users) foi há mais de 30 dias.
CREATE OR REPLACE FUNCTION public.update_dropout_students()
RETURNS void AS $$
BEGIN
    -- Atualiza o status para 'inactive' para matrículas ativas de usuários
    -- que não fazem login há mais de 30 dias.
    WITH inactive_user_ids AS (
        SELECT id
        FROM auth.users
        WHERE last_sign_in_at < (NOW() - INTERVAL '30 days')
    )
    UPDATE public.enrollments
    SET status = 'inactive'
    WHERE
        user_id IN (SELECT id FROM inactive_user_ids)
        AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- 2. Agendamento do Cron Job via pg_cron
-- O pg_cron é uma extensão do PostgreSQL usada pelo Supabase para agendar tarefas.
-- O comando abaixo agenda a função `update_dropout_students` para ser executada
-- todos os dias à meia-noite (UTC).
--
-- IMPORTANTE: A ativação do pg_cron e, por vezes, o agendamento de jobs,
-- necessitam de permissões que são gerenciadas através do painel do Supabase.
-- Se o comando abaixo falhar por falta de permissão, ele deve ser executado
-- no SQL Editor do dashboard do seu projeto Supabase.

-- Sintaxe para agendar o job:
SELECT cron.schedule(
    'daily-dropout-check', -- Nome do job (para fácil identificação)
    '0 0 * * *',           -- Expressão cron: executa à 00:00 todos os dias
    $$
    SELECT public.update_dropout_students();
    $$
);

-- Comando para remover o agendamento (caso necessário):
-- SELECT cron.unschedule('daily-dropout-check');

-- Comando para listar todos os jobs agendados:
-- SELECT * FROM cron.job;
