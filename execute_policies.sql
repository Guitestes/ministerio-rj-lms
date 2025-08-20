-- Script para executar políticas RLS para administradores
-- Execute este script diretamente no Supabase SQL Editor

-- Dropar políticas existentes se existirem
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;

-- Criar políticas para admins visualizarem todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Criar políticas para admins visualizarem todos os enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
USING (public.is_admin());

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'enrollments', 'administrative_requests')
ORDER BY tablename, policyname;