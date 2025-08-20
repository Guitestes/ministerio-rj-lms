-- Script para corrigir políticas RLS e permitir que admins vejam todos os usuários
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a função is_admin existe e está funcionando
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Verificar se há usuário autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o usuário tem role de admin
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar FALSE por segurança
        RETURN FALSE;
END;
$$;

-- 2. Garantir que RLS está habilitado na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover TODAS as políticas existentes na tabela profiles
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 4. Criar políticas RLS corretas para a tabela profiles
-- Política para usuários verem seus próprios perfis
CREATE POLICY "Users can view their own profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Política para usuários atualizarem seus próprios perfis
CREATE POLICY "Users can update their own profiles"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para admins gerenciarem todos os perfis
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Verificar se as políticas foram criadas corretamente
SELECT 
    'Políticas RLS para profiles:' as info;
    
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 6. Testar a função is_admin
SELECT 
    'Teste da função is_admin:' as info;
    
SELECT 
    auth.uid() as current_user_id,
    public.is_admin() as is_admin_result;

-- 7. Verificar se existem usuários admin na tabela profiles
SELECT 
    'Usuários admin na tabela profiles:' as info;
    
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at;

-- 8. Conceder permissões explícitas se necessário
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

SELECT 'Script de correção de RLS para gerenciamento de usuários executado com sucesso!' as resultado;