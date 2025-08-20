-- SOLUÇÃO DEFINITIVA PARA PERMISSÕES DE ALUNOS EM SOLICITAÇÕES ADMINISTRATIVAS

-- 1. CORRIGIR A CAUSA RAIZ: Conceder permissão de uso no esquema 'auth'
-- Isso permite que o PostgreSQL verifique a existência do usuário na tabela auth.users ao inserir/atualizar.
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON TABLE auth.users TO authenticated;

-- 2. LIMPAR POLÍTICAS ANTIGAS: Remover todas as políticas existentes para evitar conflitos.
-- É seguro executar mesmo que as políticas não existam.
DROP POLICY IF EXISTS "Allow authenticated users to insert their own requests" ON public.administrative_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.administrative_requests;
DROP POLICY IF EXISTS "Allow insert for own requests" ON public.administrative_requests;
DROP POLICY IF EXISTS "Alunos podem ver apenas suas próprias solicitações" ON public.administrative_requests;
DROP POLICY IF EXISTS "Alunos podem inserir solicitações apenas para si mesmos" ON public.administrative_requests;
DROP POLICY IF EXISTS "Alunos podem atualizar apenas suas próprias solicitações" ON public.administrative_requests;
DROP POLICY IF EXISTS "Alunos podem deletar apenas suas próprias solicitações" ON public.administrative_requests;


-- 3. HABILITAR RLS (SE AINDA NÃO ESTIVER HABILITADO)
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS DE CRUD CLARAS E SEGURAS PARA ALUNOS

-- Política de SELECT: Alunos podem ver apenas suas próprias solicitações.
CREATE POLICY "Alunos podem ver apenas suas próprias solicitações"
ON public.administrative_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política de INSERT: Alunos podem criar solicitações apenas para si mesmos.
CREATE POLICY "Alunos podem inserir solicitações apenas para si mesmos"
ON public.administrative_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política de UPDATE: Alunos podem atualizar apenas suas próprias solicitações.
CREATE POLICY "Alunos podem atualizar apenas suas próprias solicitações"
ON public.administrative_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Alunos podem deletar apenas suas próprias solicitações.
CREATE POLICY "Alunos podem deletar apenas suas próprias solicitações"
ON public.administrative_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 5. CONCEDER PERMISSÕES DE CRUD PARA O PERFIL 'authenticated'
-- A RLS acima garantirá que eles só possam operar em seus próprios dados.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.administrative_requests TO authenticated;