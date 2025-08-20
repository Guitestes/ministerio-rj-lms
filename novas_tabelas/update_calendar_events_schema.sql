-- =====================================================
-- ATUALIZAÇÃO DA TABELA CALENDAR_EVENTS
-- Este arquivo adiciona as colunas necessárias para
-- suporte completo a agendamento de salas e disciplinas
-- =====================================================

-- Adicionar colunas para course_id, module_id e room_id se não existirem
DO $$
BEGIN
    -- Adicionar course_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'course_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.calendar_events 
        ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.calendar_events.course_id IS 'Curso relacionado ao evento.';
    END IF;

    -- Adicionar module_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'module_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.calendar_events 
        ADD COLUMN module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.calendar_events.module_id IS 'Módulo/disciplina relacionado ao evento.';
    END IF;

    -- Adicionar room_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'room_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.calendar_events 
        ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.calendar_events.room_id IS 'Sala agendada para o evento.';
    END IF;
END $$;

-- Garantir que a tabela rooms existe (caso não tenha sido criada ainda)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS na tabela rooms se ainda não estiver habilitado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename = 'rooms'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

COMMENT ON TABLE public.rooms IS 'Armazena informações sobre salas disponíveis para agendamento.';

-- Verificar se as políticas RLS existem e criar se necessário
DO $$
BEGIN
    -- Política para visualizar salas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rooms' 
        AND policyname = 'Anyone can view rooms'
    ) THEN
        CREATE POLICY "Anyone can view rooms"
          ON public.rooms
          FOR SELECT
          USING (true);
    END IF;

    -- Política para administradores gerenciarem salas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rooms' 
        AND policyname = 'Admins can manage all rooms'
    ) THEN
        CREATE POLICY "Admins can manage all rooms"
          ON public.rooms
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
    END IF;

    -- Política para professores gerenciarem salas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rooms' 
        AND policyname = 'Professors can manage rooms'
    ) THEN
        CREATE POLICY "Professors can manage rooms"
          ON public.rooms
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND role IN ('professor', 'admin')
            )
          );
    END IF;

    -- Política para visualizar eventos de calendário
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'calendar_events' 
        AND policyname = 'Anyone can view calendar events'
    ) THEN
        CREATE POLICY "Anyone can view calendar events"
          ON public.calendar_events
          FOR SELECT
          USING (true);
    END IF;

    -- Política para administradores gerenciarem eventos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'calendar_events' 
        AND policyname = 'Admins can manage all calendar events'
    ) THEN
        CREATE POLICY "Admins can manage all calendar events"
          ON public.calendar_events
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
    END IF;

    -- Política para professores gerenciarem eventos de suas turmas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'calendar_events' 
        AND policyname = 'Professors can manage class events'
    ) THEN
        CREATE POLICY "Professors can manage class events"
          ON public.calendar_events
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.classes c
              JOIN public.profiles p ON c.instructor_id = p.id
              WHERE c.id = class_id AND p.id = auth.uid() AND p.role IN ('professor', 'admin')
            )
          );
    END IF;
END $$;

-- Log da execução
DO $$
BEGIN
    RAISE NOTICE 'Schema update completed successfully. Calendar events table now supports course_id, module_id, and room_id columns.';
END $$;