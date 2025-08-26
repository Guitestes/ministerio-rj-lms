-- Fase 4: Banco de Dados - Melhorias nos Fornecedores
-- Este script aprimora as tabelas relacionadas a prestadores de serviço
-- para atender aos requisitos de categorização, avaliação e preços.

-- 1. Aprimorar a tabela `service_providers`
-- Adiciona campos para melhor categorização e dados empresariais.
ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS service_category text,
ADD COLUMN IF NOT EXISTS service_subcategory text,
ADD COLUMN IF NOT EXISTS company_data jsonb;

-- 2. Aprimorar a tabela `contracts`
-- Adiciona campos para avaliação de cumprimento, documentos e renovações.
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS evaluation_score integer,
ADD COLUMN IF NOT EXISTS evaluation_comments text,
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS renewal_date timestamp with time zone;

-- Adiciona uma restrição para a pontuação da avaliação (ex: de 1 a 5)
-- Garante que a constraint não seja adicionada múltiplas vezes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'evaluation_score_check' AND conrelid = 'public.contracts'::regclass
    ) THEN
        ALTER TABLE public.contracts
        ADD CONSTRAINT evaluation_score_check CHECK (evaluation_score IS NULL OR (evaluation_score >= 1 AND evaluation_score <= 5));
    END IF;
END;
$$;


-- 3. Criar uma nova tabela para a lista de preços
-- Permite registrar múltiplos preços para diferentes serviços de um mesmo fornecedor.
CREATE TABLE IF NOT EXISTS public.service_price_list (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL,
    service_name text NOT NULL,
    price numeric(10, 2) NOT NULL,
    unit text, -- ex: 'per_hour', 'per_item', 'fixed'
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT service_price_list_pkey PRIMARY KEY (id),
    CONSTRAINT service_price_list_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- Adiciona um trigger para atualizar o `updated_at` automaticamente
-- (assumindo que a função moddatetime já existe)
DROP TRIGGER IF EXISTS handle_updated_at ON public.service_price_list;
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.service_price_list
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- Habilitar RLS na nova tabela e definir políticas básicas
ALTER TABLE public.service_price_list ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem gerenciar a lista de preços
CREATE POLICY "Admins can manage price lists"
ON public.service_price_list
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
