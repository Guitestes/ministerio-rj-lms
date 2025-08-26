-- Fase 3: Backend - Verificação de Conflito de Agenda
-- Este script cria um trigger no PostgreSQL para prevenir que um professor
-- seja agendado para dois eventos ao mesmo tempo.

-- 1. A Função do Trigger
-- Esta função será executada antes de qualquer inserção ou atualização na tabela calendar_events.
CREATE OR REPLACE FUNCTION public.check_schedule_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_id UUID;
    v_conflict_exists BOOLEAN;
BEGIN
    -- Obter o ID do instrutor para a turma do novo evento.
    SELECT instructor_id INTO v_instructor_id
    FROM public.classes
    WHERE id = NEW.class_id;

    -- Se não houver um instrutor para a turma, não há conflito a verificar.
    IF v_instructor_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Verificar se existe algum outro evento para o mesmo instrutor
    -- que se sobreponha no tempo com o novo evento.
    -- O operador OVERLAPS é ideal para isso.
    -- Excluímos o próprio evento (em caso de UPDATE) da verificação.
    SELECT EXISTS (
        SELECT 1
        FROM public.calendar_events ce
        JOIN public.classes c ON ce.class_id = c.id
        WHERE c.instructor_id = v_instructor_id
        AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND ce.id <> NEW.id)) -- Exclui o próprio evento se for um update
        AND (ce.start_time, ce.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    ) INTO v_conflict_exists;

    -- Se um conflito for encontrado, levanta uma exceção.
    IF v_conflict_exists THEN
        RAISE EXCEPTION 'Conflito de agendamento: O professor já está ocupado neste horário.';
    END IF;

    -- Se não houver conflito, permite que a operação continue.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. O Trigger
-- Cria o trigger que chama a função acima antes de inserir ou atualizar um evento.
-- Primeiro, remove o trigger antigo se ele existir, para garantir idempotência.
DROP TRIGGER IF EXISTS schedule_conflict_trigger ON public.calendar_events;

CREATE TRIGGER schedule_conflict_trigger
BEFORE INSERT OR UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.check_schedule_conflict();
