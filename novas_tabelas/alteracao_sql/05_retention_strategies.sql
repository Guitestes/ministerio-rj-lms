-- Fase 5: Banco de Dados - Ações de Retenção
-- Este script cria a tabela `retention_actions` para registrar as intervenções
-- feitas para alunos em risco de evasão.

-- 1. Criar a tabela `retention_actions`
CREATE TABLE IF NOT EXISTS public.retention_actions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    notes text,
    action_date timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT retention_actions_pkey PRIMARY KEY (id),
    CONSTRAINT retention_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT retention_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 2. Habilitar RLS e definir políticas
ALTER TABLE public.retention_actions ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem gerenciar as ações de retenção.
CREATE POLICY "Admins can manage retention actions"
ON public.retention_actions
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
