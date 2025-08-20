-- Script para diagnosticar e corrigir problemas com solicitações administrativas
-- Problemas identificados:
-- 1. Solicitações não aparecem para o usuário que as criou
-- 2. Solicitações não aparecem na tabela do admin
-- 3. Todas as solicitações aparecem para admin quando alterna para aluno
-- 4. Erro HTTP 300 sendo lançado

-- =====================================================
-- DIAGNÓSTICO INICIAL
-- =====================================================

-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'administrative_requests'
ORDER BY ordinal_position;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'administrative_requests';

-- Verificar políticas RLS existentes
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
ORDER BY policyname;

-- Verificar função is_admin
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_admin';

-- =====================================================
-- LIMPEZA E RECRIAÇÃO DAS POLÍTICAS
-- =====================================================

-- Remover todas as políticas existentes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'administrative_requests' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.administrative_requests';
    END LOOP;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- Recriar função is_admin com melhor tratamento de erros
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
    RETURN COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin',
        FALSE
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar FALSE por segurança
        RETURN FALSE;
END;
$$;

-- =====================================================
-- POLÍTICAS RLS CORRIGIDAS
-- =====================================================

-- 1. Política para usuários criarem suas próprias solicitações
CREATE POLICY "Users can create their own requests"
ON public.administrative_requests
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
);

-- 2. Política para usuários verem suas próprias solicitações
CREATE POLICY "Users can view their own requests"
ON public.administrative_requests
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
);

-- 3. Política para admins verem todas as solicitações
CREATE POLICY "Admins can view all requests"
ON public.administrative_requests
FOR SELECT
TO authenticated
USING (
    public.is_admin() = TRUE
);

-- 4. Política para admins atualizarem todas as solicitações
CREATE POLICY "Admins can update all requests"
ON public.administrative_requests
FOR UPDATE
TO authenticated
USING (
    public.is_admin() = TRUE
)
WITH CHECK (
    public.is_admin() = TRUE
);

-- 5. Política para admins deletarem todas as solicitações
CREATE POLICY "Admins can delete all requests"
ON public.administrative_requests
FOR DELETE
TO authenticated
USING (
    public.is_admin() = TRUE
);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar políticas criadas
SELECT 
    'Políticas RLS criadas:' as info;
    
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
ORDER BY policyname;

-- Testar função is_admin
SELECT 
    'Teste da função is_admin:' as info,
    public.is_admin() as is_current_user_admin;

-- Verificar solicitações existentes
SELECT 
    'Solicitações existentes:' as info;
    
SELECT 
    id,
    user_id,
    request_type,
    subject,
    status,
    created_at
FROM public.administrative_requests
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- TESTE DE INSERÇÃO (OPCIONAL)
-- =====================================================

-- Descomentar para testar inserção de uma nova solicitação
/*
INSERT INTO public.administrative_requests (
    user_id,
    request_type,
    subject,
    description,
    status
) VALUES (
    auth.uid(),
    'test',
    'Teste de solicitação após correção',
    'Esta é uma solicitação de teste para verificar se as políticas RLS estão funcionando corretamente.',
    'pending'
);
*/

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================

-- Para resolver o erro HTTP 300:
-- 1. O erro está sendo lançado no client.ts linha 333
-- 2. Isso acontece quando o servidor retorna um status HTTP não tratado
-- 3. Verifique se há conflitos de políticas RLS
-- 4. Execute este script no SQL Editor do Supabase
-- 5. Teste a criação e visualização de solicitações

SELECT 'Script executado com sucesso! Teste agora a criação e visualização de solicitações administrativas.' as resultado;