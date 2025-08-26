-- Adicionar coluna course_type na tabela courses
ALTER TABLE public.courses
ADD COLUMN course_type TEXT DEFAULT 'presencial';

-- Atualizar valores existentes baseado na coluna nature (se existir)
UPDATE public.courses
SET course_type = COALESCE(nature, 'presencial')
WHERE course_type IS NULL OR course_type = '';

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.courses.course_type IS 'Tipo do curso: presencial, online, híbrido, etc.';