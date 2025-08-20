-- Diagnóstico detalhado do problema de INSERT em administrative_requests
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar a política de INSERT atual
SELECT 
    'POLÍTICA DE INSERT ATUAL:' as section;
    
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
AND cmd = 'INSERT';

-- 2. Verificar se a função is_admin existe e seu código
SELECT 
    'FUNÇÃO IS_ADMIN:' as section;
    
SELECT 
    proname,
    prosrc,
    provolatile,
    prosecdef
FROM pg_proc 
WHERE proname = 'is_admin'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Testar auth.uid() e is_admin() com tratamento de erro
SELECT 
    'TESTE DE FUNÇÕES:' as section;

DO $$
BEGIN
    BEGIN
        RAISE NOTICE 'auth.uid(): %', auth.uid();
        RAISE NOTICE 'is_admin(): %', public.is_admin();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao testar funções: %', SQLERRM;
    END;
END $$;

-- 4. Verificar se o usuário atual existe na tabela profiles
SELECT 
    'VERIFICAÇÃO DO USUÁRIO:' as section;
    
SELECT 
    id,
    email,
    role,
    created_at
FROM public.profiles 
WHERE id = auth.uid();

-- 5. Verificar permissões da tabela
SELECT 
    'PERMISSÕES DA TABELA:' as section;
    
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'administrative_requests'
AND grantee IN ('authenticated', 'public', 'anon')
ORDER BY grantee, privilege_type;

-- 6. Verificar constraints da tabela
SELECT 
    'CONSTRAINTS DA TABELA:' as section;
    
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'administrative_requests'
ORDER BY constraint_type, constraint_name;

-- 7. Teste de inserção com diferentes abordagens
SELECT 
    'TESTE DE INSERÇÃO:' as section;

-- Primeiro, verificar se conseguimos fazer um SELECT simples
SELECT 
    'Teste SELECT:' as test_type,
    COUNT(*) as record_count
FROM public.administrative_requests;

-- Verificar se conseguimos fazer INSERT com dados mínimos
-- (Descomente para testar)
/*
INSERT INTO public.administrative_requests (
    user_id,
    request_type,
    description,
    status
) VALUES (
    auth.uid(),
    'test',
    'Teste de diagnóstico',
    'pending'
);
*/

-- 8. Verificar se há triggers que podem estar interferindo
SELECT 
    'TRIGGERS DA TABELA:' as section;
    
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table = 'administrative_requests';