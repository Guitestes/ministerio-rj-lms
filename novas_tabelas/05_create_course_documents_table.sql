-- Criação da tabela de Documentos do Curso
CREATE TABLE public.course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  bucket_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;

-- Adicionar comentários
COMMENT ON TABLE public.course_documents IS 'Armazena documentos didáticos associados a um curso.';
COMMENT ON COLUMN public.course_documents.course_id IS 'Referência ao curso ao qual o documento pertence.';
COMMENT ON COLUMN public.course_documents.document_name IS 'Nome do documento para exibição.';
COMMENT ON COLUMN public.course_documents.document_url IS 'URL para acessar o documento.';
COMMENT ON COLUMN public.course_documents.file_type IS 'Tipo MIME do arquivo (ex: application/pdf, image/jpeg).';
COMMENT ON COLUMN public.course_documents.file_size IS 'Tamanho do arquivo em bytes.';
COMMENT ON COLUMN public.course_documents.bucket_path IS 'Caminho do arquivo no bucket do Supabase Storage.';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_documents_updated_at
    BEFORE UPDATE ON public.course_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();}]}}}
