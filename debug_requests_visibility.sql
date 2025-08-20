-- Script para debugar problemas de visibilidade das solicitações administrativas
-- Execute este script no SQL Editor do Supabase para diagnosticar os problemas

-- =====================================================
-- DIAGNÓSTICO DETALHADO
-- =====================================================

-- 1. Verificar usuário atual e seu papel
SELECT 
    'Usuário atual:' as info,
    auth.uid() as current_user_id,
    COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'Usuário não encontrado'
    ) as current_user_email,
    COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()),
        'Perfil não encontrado'
    ) as current_user_role,
    public.is_admin() as is_current_user_admin;

-- 2. Verificar todos os usuários e seus papéis
SELECT 
    'Todos os usuários:' as info;
    
SELECT 
    p.id,
    au.email,
    p.name,
    p.role,
    CASE WHEN p.role = 'admin' THEN 'SIM' ELSE 'NÃO' END as is_admin
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.role, p.name;

-- 3. Verificar todas as solicitações existentes (sem filtros RLS)
SELECT 
    'Todas as solicitações (sem RLS):' as info;
    
-- Temporariamente desabilitar RLS para ver todos os dados
SET row_security = off;

SELECT 
    ar.id,
    ar.user_id,
    p.email as user_email,
    p.name as user_name,
    p.role as user_role,
    ar.request_type,
    ar.subject,
    ar.status,
    ar.created_at
FROM public.administrative_requests ar
LEFT JOIN public.profiles p ON ar.user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY ar.created_at DESC;

-- Reabilitar RLS
SET row_security = on;

-- 4. Testar políticas RLS para o usuário atual
SELECT 
    'Solicitações visíveis com RLS (usuário atual):' as info;
    
SELECT 
    ar.id,
    ar.user_id,
    ar.request_type,
    ar.subject,
    ar.status,
    ar.created_at,
    CASE 
        WHEN ar.user_id = auth.uid() THEN 'Própria solicitação'
        WHEN public.is_admin() THEN 'Visível por ser admin'
        ELSE 'Não deveria ser visível'
    END as visibility_reason
FROM public.administrative_requests ar
ORDER BY ar.created_at DESC;

-- 5. Verificar políticas RLS ativas
SELECT 
    'Políticas RLS ativas:' as info;
    
SELECT 
    policyname,
    cmd as command,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
ORDER BY cmd, policyname;

-- 6. Testar função is_admin com diferentes usuários
SELECT 
    'Teste da função is_admin:' as info;

-- Verificar se a função is_admin está funcionando corretamente
SELECT 
    p.id,
    p.email,
    p.role,
    -- Simular chamada da função para cada usuário
    CASE 
        WHEN p.role = 'admin' THEN TRUE
        ELSE FALSE
    END as should_be_admin
FROM (
    SELECT 
        pr.id,
        au.email,
        pr.role
    FROM public.profiles pr
    LEFT JOIN auth.users au ON pr.id = au.id
    WHERE pr.role IS NOT NULL
) p
ORDER BY p.role, p.email;

-- =====================================================
-- CORREÇÕES ESPECÍFICAS
-- =====================================================

-- Verificar se há conflitos de políticas
SELECT 
    'Verificando conflitos de políticas:' as info;

-- Contar políticas por comando
SELECT 
    cmd as command,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
GROUP BY cmd
ORDER BY cmd;

-- =====================================================
-- TESTE DE INSERÇÃO E CONSULTA
-- =====================================================

-- Teste de inserção (descomente para testar)
/*
INSERT INTO public.administrative_requests (
    user_id,
    request_type,
    subject,
    description,
    status
) VALUES (
    auth.uid(),
    'debug_test',
    'Teste de debug - ' || CURRENT_TIMESTAMP,
    'Esta é uma solicitação de teste para verificar a visibilidade.',
    'pending'
);
*/

-- Verificar se a inserção foi bem-sucedida e é visível
SELECT 
    'Últimas solicitações após teste:' as info;
    
SELECT 
    id,
    user_id,
    request_type,
    subject,
    status,
    created_at,
    CASE 
        WHEN user_id = auth.uid() THEN 'Minha solicitação'
        ELSE 'Solicitação de outro usuário'
    END as ownership
FROM public.administrative_requests
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- =====================================================
-- INSTRUÇÕES PARA CORREÇÃO
-- =====================================================

SELECT 
    'INSTRUÇÕES PARA CORREÇÃO:' as info,
    '
1. Execute o script fix_administrative_requests_final.sql
2. Verifique se o usuário guigasprogramador@gmail.com tem role "admin" na tabela profiles
3. Teste a criação de solicitações com diferentes usuários
4. Verifique se as políticas RLS estão funcionando corretamente
5. O erro HTTP 300 foi corrigido no client.ts
' as instructions;

-- Verificar especificamente o usuário mencionado
SELECT 
    'Verificação do usuário guigasprogramador@gmail.com:' as info;
    
SELECT 
    p.id,
    au.email,
    p.name,
    p.role,
    CASE WHEN p.role = 'admin' THEN 'SIM' ELSE 'NÃO' END as is_admin,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'guigasprogramador@gmail.com'
OR p.name ILIKE '%guiga%'
OR au.email ILIKE '%guiga%';