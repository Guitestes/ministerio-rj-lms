-- =====================================================
-- PARTE 1: TRIGGERS E FUNÇÕES ESSENCIAIS
-- =====================================================

-- Function to update course enrollment count
CREATE OR REPLACE FUNCTION public.update_course_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses
    SET "enrolledCount" = "enrolledCount" + 1
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET "enrolledCount" = GREATEST("enrolledCount" - 1, 0)
    WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update course enrollment count
-- Removendo o trigger antigo para evitar duplicatas antes de criar um novo
DROP TRIGGER IF EXISTS update_course_enrolled_count_trigger ON public.enrollments;
CREATE TRIGGER update_course_enrolled_count_trigger
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_course_enrolled_count();

-- Function to handle new users (create profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile when new user signs up
-- Removendo o trigger antigo para evitar duplicatas antes de criar um novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Adicionando uma função para garantir que a role do usuário seja definida no perfil
CREATE OR REPLACE FUNCTION public.assign_user_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS NOT NULL AND NEW.role <> '' THEN
    UPDATE public.profiles
    SET role = NEW.role
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atribuir a role ao perfil
DROP TRIGGER IF EXISTS on_user_role_change ON auth.users;
CREATE TRIGGER on_user_role_change
AFTER UPDATE OF raw_user_meta_data ON auth.users
FOR EACH ROW
WHEN (OLD.raw_user_meta_data->>'role' IS DISTINCT FROM NEW.raw_user_meta_data->>'role')
EXECUTE FUNCTION public.assign_user_role();

-- =====================================================
-- PARTE 2: CORREÇÃO DAS POLÍTICAS DE SOLICITAÇÕES
-- =====================================================

-- Remover todas as políticas existentes em 'administrative_requests' para um novo começo
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

-- Garantir que RLS está habilitado na tabela
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_requests FORCE ROW LEVEL SECURITY;

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
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar FALSE por segurança
        RETURN FALSE;
END;
$$;

-- =====================================================
-- POLÍTICAS RLS CORRIGIDAS PARA 'administrative_requests'
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
    public.is_admin()
);

-- 4. Política para admins atualizarem todas as solicitações
CREATE POLICY "Admins can update all requests"
ON public.administrative_requests
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);

-- 5. Política para admins deletarem todas as solicitações
-- 5. Política para admins atualizarem todas as solicitações
CREATE POLICY "Admins can update all requests"
ON public.administrative_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Política para admins deletarem todas as solicitações
CREATE POLICY "Admins can delete all requests"
ON public.administrative_requests
FOR DELETE
TO authenticated
USING (public.is_admin());


-- =====================================================
-- PARTE 3: FUNÇÕES DE ADMINISTRAÇÃO DE USUÁRIOS
-- =====================================================

-- Função para deletar um usuário e todos os seus dados relacionados
CREATE OR REPLACE FUNCTION public.delete_user_data(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário que está chamando a função é um admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta função.';
    END IF;

    -- Deletar dados relacionados em outras tabelas
    DELETE FROM public.enrollments WHERE user_id = user_id_to_delete;
    DELETE FROM public.lesson_progress WHERE user_id = user_id_to_delete;
    DELETE FROM public.certificates WHERE user_id = user_id_to_delete;
    DELETE FROM public.administrative_requests WHERE user_id = user_id_to_delete;
    DELETE FROM public.request_comments WHERE user_id = user_id_to_delete;
    DELETE FROM public.quiz_attempts WHERE user_id = user_id_to_delete;
    DELETE FROM public.academic_works WHERE user_id = user_id_to_delete;

    -- Deletar o perfil do usuário
    DELETE FROM public.profiles WHERE id = user_id_to_delete;

    -- Deletar o usuário do sistema de autenticação
    -- Esta é uma operação de administrador e requer a service_role key.
    -- A função é SECURITY DEFINER, então ela será executada com os privilégios do criador (normalmente o superusuário do banco de dados).
    PERFORM auth.admin_delete_user(user_id_to_delete);
END;
$$;


SELECT 'Script de correção de RLS, Triggers e Funções de Admin executado com sucesso!' as "Resultado";
