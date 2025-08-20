-- VERIFICAÇÃO FINAL: Sistema de Solicitações Administrativas
-- Execute este script no SQL Editor do Supabase para verificar se tudo está funcionando

-- 1. Verificar se a tabela administrative_requests existe e tem a estrutura correta
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'administrative_requests'
ORDER BY ordinal_position;

-- 2. Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'administrative_requests';

-- 3. Listar todas as políticas RLS ativas
SELECT 
    policyname,
    cmd as policy_type,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'administrative_requests'
ORDER BY policyname;

-- 4. Verificar se a função is_admin existe
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_admin';

-- 5. Testar inserção de uma solicitação (substitua o user_id por um ID válido)
-- IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' por um UUID válido da tabela profiles
/*
INSERT INTO public.administrative_requests (
    user_id,
    request_type,
    subject,
    description,
    status
) VALUES (
    'SEU_USER_ID_AQUI',  -- Substitua por um UUID válido
    'declaracao',
    'Teste de solicitação',
    'Esta é uma solicitação de teste para verificar se o sistema está funcionando',
    'open'
);
*/

-- 6. Verificar solicitações existentes
SELECT 
    id,
    user_id,
    request_type,
    subject,
    status,
    created_at
FROM public.administrative_requests
ORDER BY created_at DESC
LIMIT 5;

-- 7. Verificar usuários disponíveis para teste
SELECT 
    id,
    email,
    role
FROM public.profiles
LIMIT 5;

-- RESULTADO ESPERADO:
-- ✅ A tabela administrative_requests deve existir com as colunas corretas
-- ✅ RLS deve estar habilitado (rls_enabled = true)
-- ✅ Deve haver políticas RLS ativas para INSERT, SELECT, UPDATE, DELETE
-- ✅ A função is_admin deve existir
-- ✅ Deve ser possível inserir solicitações para usuários válidos
-- ✅ Deve ser possível visualizar solicitações existentes

-- Se todos os testes passarem, o sistema está funcionando corretamente!
-- Os alunos agora podem criar solicitações administrativas sem erro HTTP 409.