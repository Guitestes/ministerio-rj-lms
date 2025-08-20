-- Script para diagnosticar problema de INSERT em administrative_requests
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar estrutura da tabela administrative_requests
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'administrative_requests'
ORDER BY ordinal_position;

-- 2. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests';

-- 3. Verificar políticas atuais
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
ORDER BY cmd, policyname;

-- 4. Testar a função is_admin
SELECT 
    'Testando função is_admin:' as test_type,
    public.is_admin() as result;

-- 5. Verificar se auth.uid() retorna valor
SELECT 
    'Testando auth.uid():' as test_type,
    auth.uid() as current_user_id;

-- 6. Verificar permissões na tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'administrative_requests'
ORDER BY grantee, privilege_type;

-- 7. Tentar INSERT simples para testar (substitua USER_ID_AQUI por um UUID válido)
-- INSERT INTO public.administrative_requests (user_id, request_type, description, status)
-- VALUES ('USER_ID_AQUI', 'enrollment_change', 'Teste de inserção', 'pending');

-- 8. Verificar se há triggers que podem estar bloqueando
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table = 'administrative_requests';

-- 9. Verificar constraints que podem estar causando problemas
SELECT 
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'administrative_requests';

-- 10. Verificar se há foreign keys problemáticas
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name = 'administrative_requests';