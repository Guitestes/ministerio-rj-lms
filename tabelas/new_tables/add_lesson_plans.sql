-- Tabela para Planos de Aula
CREATE TABLE public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  objectives TEXT,
  materials TEXT,
  activities TEXT,
  assessment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.lesson_plans IS 'Armazena planos de aula detalhados para cada lição.';