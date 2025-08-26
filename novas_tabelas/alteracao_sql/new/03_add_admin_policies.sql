-- Adicionar políticas RLS para admins visualizarem todos os profiles e enrollments

-- Dropar política se existir
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Política para admins visualizarem todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Dropar política se existir
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;

-- Política para admins visualizarem todos os enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
USING (public.is_admin());