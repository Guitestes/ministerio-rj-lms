-- Script para corrigir os roles de administradores na tabela profiles
-- Execute este script no Supabase SQL Editor

-- 1. Verificar usuários atuais e seus roles
SELECT 
    'USUÁRIOS ATUAIS NA TABELA PROFILES:' as info;
    
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM public.profiles 
ORDER BY created_at;

-- 2. Verificar quais emails de admin estão na tabela profiles
SELECT 
    'EMAILS DE ADMIN CONFIGURADOS:' as info;

SELECT 
    email,
    CASE 
        WHEN email IN (
            'guigasprogramador@gmail.com',
            'admin@example.com',
            'maria.silva@professor.com',
            'joao.santos@professor.com'
        ) THEN 'DEVERIA SER ADMIN'
        ELSE 'NÃO É ADMIN'
    END as status_esperado,
    role as role_atual
FROM public.profiles 
WHERE email IN (
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.com',
    'joao.santos@professor.com'
)
ORDER BY email;

-- 3. Atualizar roles para todos os emails de admin configurados
UPDATE public.profiles 
SET role = 'admin'
WHERE email IN (
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.com',
    'joao.santos@professor.com'
)
AND role != 'admin';

-- 4. Verificar se as atualizações foram aplicadas
SELECT 
    'VERIFICAÇÃO APÓS ATUALIZAÇÃO:' as info;
    
SELECT 
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

-- 5. Testar a função is_admin para cada usuário admin
SELECT 
    'TESTE DA FUNÇÃO IS_ADMIN:' as info;

-- Simular teste da função is_admin para cada admin
SELECT 
    p.email,
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN 'TRUE'
        ELSE 'FALSE'
    END as is_admin_result
FROM public.profiles p
WHERE p.email IN (
    'guigasprogramador@gmail.com',
    'admin@example.com',
    'maria.silva@professor.',
    'joao.santos@professor.com'
)
ORDER BY p.email;
com
-- 6. Verificar políticas RLS que podem estar afetando o acesso
SELECT 
    'POLÍTICAS RLS ATIVAS PARA PROFILES:' as info;
    
SELECT 
    policyname,
    cmd as command,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

SELECT 'Script de correção de roles de administradores executado com sucesso!' as resultado;