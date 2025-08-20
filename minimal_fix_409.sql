-- Script mínimo para corrigir erro 409 - Foco nas políticas essenciais
-- Execute este script no SQL Editor do Supabase

-- PASSO 1: Remover TODAS as políticas das tabelas problemáticas
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Limpar enrollments
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'enrollments' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.enrollments';
    END LOOP;
    
    -- Limpar profiles
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- PASSO 2: Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas MÍNIMAS para PROFILES
-- Política básica para usuários verem seus próprios perfis
CREATE POLICY "basic_profile_access"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASSO 4: Criar políticas MÍNIMAS para ENROLLMENTS
-- Política básica para usuários gerenciarem suas próprias matrículas
CREATE POLICY "basic_enrollment_access"
ON public.enrollments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PASSO 5: Conceder permissões amplas para evitar conflitos
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.administrative_requests TO authenticated;

-- PASSO 6: Verificar resultado
SELECT 
    'Políticas após limpeza:' as status;
    
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('administrative_requests', 'profiles', 'enrollments')
GROUP BY tablename
ORDER BY tablename;