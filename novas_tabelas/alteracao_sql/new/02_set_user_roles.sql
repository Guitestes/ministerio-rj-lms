-- Function to get all users with their admin and professor roles
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    is_admin BOOLEAN,
    is_professor BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing tables securely
AS $$
BEGIN
    -- This function should only be callable by admins.
    -- The check is performed in RLS policies on the calling frontend or API layer.
    -- For direct calls, ensure the caller has appropriate permissions.
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        (p.role = 'admin') AS is_admin,
        EXISTS (SELECT 1 FROM public.professor_details pd WHERE pd.user_id = p.id) AS is_professor
    FROM
        public.profiles p;
END;
$$;

-- Function to set a user's roles atomically
CREATE OR REPLACE FUNCTION public.set_user_roles(
    target_user_id UUID,
    make_admin BOOLEAN,
    make_professor BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- This function should only be callable by an admin.
    -- We can add an explicit check here for safety.
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can change user roles.';
    END IF;

    -- Set admin role
    IF make_admin THEN
        UPDATE public.profiles SET role = 'admin' WHERE id = target_user_id;
    ELSE
        -- If they are not being made an admin, what should their role be?
        -- Let's set it to 'student' if it's currently 'admin'.
        UPDATE public.profiles SET role = 'student' WHERE id = target_user_id AND role = 'admin';
    END IF;

    -- Set professor role
    IF make_professor THEN
        -- Insert into professor_details if not already there (UPSERT)
        INSERT INTO public.professor_details (user_id, bio, specialization)
        VALUES (target_user_id, 'Professor bio placeholder.', 'Specialization placeholder.')
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Remove from professor_details if they exist
        DELETE FROM public.professor_details WHERE user_id = target_user_id;
    END IF;
END;
$$;

-- Grant permissions to the authenticated role, assuming RLS will handle admin checks.
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_roles(UUID, BOOLEAN, BOOLEAN) TO authenticated;
