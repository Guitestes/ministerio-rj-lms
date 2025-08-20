-- Script de emergência para permitir criação de solicitações
-- Execute este script no SQL Editor do Supabase

-- OPÇÃO 1: Desabilitar RLS temporariamente na tabela administrative_requests
-- (Use apenas se necessário para testes)
-- ALTER TABLE public.administrative_requests DISABLE ROW LEVEL SECURITY;

-- OPÇÃO 2: Criar política permissiva para INSERT (RECOMENDADO)
-- Primeiro, dropar todas as políticas de INSERT existentes
DROP POLICY IF EXISTS "Users can create their own administrative requests" ON public.administrative_requests;
DROP POLICY IF EXISTS "Users can create own requests" ON public.administrative_requests;
DROP POLICY IF EXISTS "Users can create requests for themselves" ON public.administrative_requests;

-- Criar política muito permissiva para INSERT
CREATE POLICY "Allow all authenticated users to create requests"
ON public.administrative_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- OPÇÃO 3: Conceder permissões diretas (adicional)
GRANT INSERT ON public.administrative_requests TO authenticated;
GRANT INSERT ON public.administrative_requests TO anon;

-- OPÇÃO 4: Verificar se a política está funcionando
SELECT 
    'Políticas de INSERT atuais:' as info;
    
SELECT 
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests'
AND cmd = 'INSERT';

-- OPÇÃO 5: Teste de inserção (descomente e substitua o UUID)
/*
INSERT INTO public.administrative_requests (
    user_id, 
    request_type, 
    description, 
    status
) VALUES (
    auth.uid(), 
    'enrollment_change', 
    'Teste de solicitação', 
    'pending'
);
*/

-- OPÇÃO 6: Se ainda não funcionar, criar política bypass completa
-- DROP POLICY IF EXISTS "Allow all authenticated users to create requests" ON public.administrative_requests;
-- CREATE POLICY "Bypass all restrictions for requests"
-- ON public.administrative_requests
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- Verificar resultado final
SELECT 
    'Status final da tabela:' as info;
    
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    COUNT(*) as total_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename = 'administrative_requests'
GROUP BY t.schemaname, t.tablename, t.rowsecurity;