-- Tabela para Salas
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rooms IS 'Armazena informações sobre salas disponíveis para agendamento.';

-- Adicionar campo para agendamento de sala em eventos do calendário
ALTER TABLE public.calendar_events
ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.calendar_events.room_id IS 'Sala agendada para o evento.';