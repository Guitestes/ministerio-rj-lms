-- Script para verificar status do RLS no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado usando pg_class
SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname = 'administrative_requests'
AND c.relkind = 'r';

-- 2. Verificar políticas RLS específicas para INSERT
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
AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Verificar se a função is_admin existe e funciona
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'is_admin'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Testar auth.uid() e is_admin()
SELECT 
    'Current User ID:' as info,
    auth.uid()::text as value
UNION ALL
SELECT 
    'Is Admin:' as info,
    public.is_admin()::text as value;

-- 5. Verificar permissões específicas para authenticated role
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'administrative_requests'
AND grantee IN ('authenticated', 'public', 'anon')
ORDER BY grantee, privilege_type;

-- 6. Verificar se há políticas conflitantes
SELECT 
    'Total policies:' as info,
    count(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
UNION ALL
SELECT 
    'INSERT policies:' as info,
    count(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
AND cmd = 'INSERT';