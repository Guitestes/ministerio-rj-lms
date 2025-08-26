-- Grant usage on the auth schema to the authenticated role
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant select on the users table to the authenticated role
GRANT SELECT ON TABLE auth.users TO authenticated;

-- Grant all permissions on the profiles table to the authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- Grant all permissions on the profiles table to the service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;