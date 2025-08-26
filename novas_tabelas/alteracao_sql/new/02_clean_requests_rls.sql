-- Script to clean up duplicate RLS policies on administrative_requests and recreate standard ones

-- Drop all existing policies on the table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'administrative_requests' LOOP
        EXECUTE 'DROP POLICY "' || pol.policyname || '" ON public.administrative_requests';
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is an admin
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

-- Standard policies
CREATE POLICY "Users can create their own administrative requests"
ON public.administrative_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own administrative requests"
ON public.administrative_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all administrative requests"
ON public.administrative_requests
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update all administrative requests"
ON public.administrative_requests
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete all administrative requests"
ON public.administrative_requests
FOR DELETE
USING (public.is_admin());