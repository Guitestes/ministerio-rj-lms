-- Tabela de Pré-requisitos para Módulos
CREATE TABLE public.module_prerequisites (
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  prerequisite_module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  PRIMARY KEY (module_id, prerequisite_module_id)
);

ALTER TABLE public.module_prerequisites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.module_prerequisites IS 'Define os pré-requisitos entre módulos.';
COMMENT ON COLUMN public.module_prerequisites.module_id IS 'O módulo que requer um pré-requisito.';
COMMENT ON COLUMN public.module_prerequisites.prerequisite_module_id IS 'O módulo que é o pré-requisito.';