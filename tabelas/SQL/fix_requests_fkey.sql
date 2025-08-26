-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to insert their own requests" ON public.administrative_requests;

-- Create a new policy that allows authenticated users to insert requests for themselves
CREATE POLICY "Allow authenticated users to insert their own requests"
ON public.administrative_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Grant insert permission to authenticated users
GRANT INSERT ON TABLE public.administrative_requests TO authenticated;