-- Script completo para garantir que todos os administradores tenham acesso igual às funções
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, verificar e corrigir a tabela profiles
SELECT 'ETAPA 1: Verificando e corrigindo tabela profiles' as etapa;

-- Garantir que a tabela profiles tenha as colunas necessárias
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

-- Atualizar emails dos perfis baseado na tabela auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND (p.email IS NULL OR p.email = '');

-- 2. Definir todos os administradores configurados
SELECT 'ETAPA 2: Definindo administradores' as etapa;

-- Atualizar roles para todos os emails de admin configurados no sistema
UPDATE public.profiles 
SET role = 'admin'
WHERE email IN (
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.com',
    'joao.santos@professor.com'
);

-- 3. Remover políticas RLS conflitantes
SELECT 'ETAPA 3: Removendo políticas conflitantes' as etapa;

-- Remover todas as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Permitir acesso a todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- 4. Criar função is_admin atualizada
SELECT 'ETAPA 4: Criando função is_admin' as etapa;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_email text;
BEGIN
    -- Buscar role e email do usuário atual
    SELECT p.role, p.email INTO user_role, user_email
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    -- Verificar se é admin por role ou por email
    RETURN (
        user_role = 'admin' OR 
        user_email IN (
            'guigasprogramador@gmail.com',
            'admin@example.com',
            'maria.silva@professor.com',
            'joao.santos@professor.com'
        )
    );
END;
$$;

-- 5. Criar políticas RLS permissivas para administradores
SELECT 'ETAPA 5: Criando políticas RLS para administradores' as etapa;

-- Política para SELECT - Admins podem ver todos os perfis, outros só o próprio
CREATE POLICY "admin_can_view_all_profiles" ON public.profiles
FOR SELECT
USING (
    public.is_admin() OR 
    auth.uid() = id
);

-- Política para INSERT - Admins podem inserir qualquer perfil
CREATE POLICY "admin_can_insert_profiles" ON public.profiles
FOR INSERT
WITH CHECK (
    public.is_admin() OR 
    auth.uid() = id
);

-- Política para UPDATE - Admins podem atualizar qualquer perfil
CREATE POLICY "admin_can_update_profiles" ON public.profiles
FOR UPDATE
USING (
    public.is_admin() OR 
    auth.uid() = id
)
WITH CHECK (
    public.is_admin() OR 
    auth.uid() = id
);

-- Política para DELETE - Apenas admins podem deletar perfis
CREATE POLICY "admin_can_delete_profiles" ON public.profiles
FOR DELETE
USING (public.is_admin());

-- 6. Garantir que RLS esteja habilitado
SELECT 'ETAPA 6: Habilitando RLS' as etapa;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Criar função get_all_users para administradores
SELECT 'ETAPA 7: Criando função get_all_users' as etapa;

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    name text,
    email text,
    role text,
    created_at timestamp with time zone,
    avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar todos os usuários';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.email,
        COALESCE(p.role, 'student') as role,
        p.created_at,
        p.avatar_url
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- 8. Verificar se as correções foram aplicadas
SELECT 'ETAPA 8: Verificação final' as etapa;

-- Verificar administradores
SELECT 
    'ADMINISTRADORES CONFIGURADOS:' as info,
    email,
    role,
    CASE 
        WHEN role = 'admin' THEN 'CORRETO'
        ELSE 'PRECISA CORREÇÃO'
    END as status
FROM public.profiles 
WHERE email IN (
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.com',
    'joao.santos@professor.com'
)
ORDER BY email;

-- Verificar políticas RLS
SELECT 
    'POLÍTICAS RLS ATIVAS:' as info,
    policyname,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Testar função is_admin
SELECT 
    'TESTE DA FUNÇÃO IS_ADMIN:' as info,
    public.is_admin() as resultado;

SELECT 'Script de correção completa executado com sucesso!' as resultado;
SELECT 'Todos os administradores agora devem ter acesso igual às funções da aplicação.' as conclusao;