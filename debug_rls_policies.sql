-- Script de diagnóstico para verificar políticas RLS e identificar conflitos

-- 1. Verificar todas as políticas na tabela administrative_requests
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests';

-- 3. Verificar a função is_admin
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'is_admin'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Verificar políticas em profiles (necessária para is_admin funcionar)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- 5. Verificar políticas em enrollments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'enrollments'
ORDER BY policyname;

-- 6. Testar a função is_admin com um usuário específico
-- (Substitua 'USER_ID_AQUI' pelo ID real do usuário admin)
-- SELECT public.is_admin() as is_current_user_admin;

-- 7. Verificar se existem políticas conflitantes ou duplicadas
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('administrative_requests', 'profiles', 'enrollments')
GROUP BY tablename
ORDER BY tablename;