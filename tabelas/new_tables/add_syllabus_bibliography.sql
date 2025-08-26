-- Adicionar campos para ementa e bibliografia em cursos
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS syllabus TEXT,
ADD COLUMN IF NOT EXISTS bibliography TEXT;

-- Adicionar campos para ementa e bibliografia em módulos
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS syllabus TEXT,
ADD COLUMN IF NOT EXISTS bibliography TEXT;

COMMENT ON COLUMN public.courses.syllabus IS 'Ementa do curso.';
COMMENT ON COLUMN public.courses.bibliography IS 'Bibliografia do curso.';
COMMENT ON COLUMN public.modules.syllabus IS 'Ementa do módulo.';
COMMENT ON COLUMN public.modules.bibliography IS 'Bibliografia do módulo.';