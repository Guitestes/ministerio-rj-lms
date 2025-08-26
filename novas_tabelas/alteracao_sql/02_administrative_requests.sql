-- Fase 2: Banco de Dados - Sistema de Solicitações Administrativas
-- Este script cria as tabelas necessárias para um sistema de tickets/solicitações,
-- incluindo as políticas de segurança (RLS) para o Supabase.

-- 1. Tabela para armazenar as solicitações (tickets)
CREATE TABLE public.administrative_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    request_type text NOT NULL,
    subject text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'open',
    assigned_to uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT administrative_requests_pkey PRIMARY KEY (id),
    CONSTRAINT administrative_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT administrative_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Adiciona um trigger para atualizar o `updated_at` automaticamente
-- Assumindo que a função moddatetime() já existe, o que é comum em projetos Supabase.
-- Se não existir, pode ser criada com:
-- CREATE OR REPLACE FUNCTION moddatetime()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.administrative_requests
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 2. Tabela para armazenar os comentários de uma solicitação
CREATE TABLE public.request_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT request_comments_pkey PRIMARY KEY (id),
    CONSTRAINT request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.administrative_requests(id) ON DELETE CASCADE,
    CONSTRAINT request_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);


-- 3. Políticas de Segurança (Row Level Security - RLS)

-- Habilitar RLS para as novas tabelas
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Policies for `administrative_requests`
CREATE POLICY "Users can view their own requests"
ON public.administrative_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
ON public.administrative_requests FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create requests for themselves"
ON public.administrative_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any request"
ON public.administrative_requests FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Policies for `request_comments`
CREATE POLICY "Users can view comments on their accessible requests"
ON public.request_comments FOR SELECT
USING (
    (
        SELECT TRUE
        FROM public.administrative_requests
        WHERE id = request_id
    )
);

CREATE POLICY "Users can create comments on their accessible requests"
ON public.request_comments FOR INSERT
WITH CHECK (
    (
        SELECT TRUE
        FROM public.administrative_requests
        WHERE id = request_id
    )
);

CREATE POLICY "Admins can manage all comments"
ON public.request_comments FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
