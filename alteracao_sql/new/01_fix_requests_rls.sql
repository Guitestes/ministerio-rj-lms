-- Policies for "administrative_requests" table

-- First, ensure RLS is enabled on the table
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- 1. Policy for users to create their own requests
CREATE POLICY "Users can create their own administrative requests"
ON public.administrative_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Policy for users to see their own requests
CREATE POLICY "Users can view their own administrative requests"
ON public.administrative_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Helper function to check if a user is an admin based on the profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$;

-- 3. Policy for admins to see all requests
CREATE POLICY "Admins can view all administrative requests"
ON public.administrative_requests
FOR SELECT
USING (public.is_admin());

-- 4. Policy for admins to update all requests
CREATE POLICY "Admins can update all administrative requests"
ON public.administrative_requests
FOR UPDATE
USING (public.is_admin());

-- 5. Policy for admins to delete all requests
CREATE POLICY "Admins can delete all administrative requests"
ON public.administrative_requests
FOR DELETE
USING (public.is_admin());
