-- Fix for role management: Allow self-role updates for admin emails
-- This function allows users to update their own roles if their email is in the admin list

CREATE OR REPLACE FUNCTION public.set_user_roles_with_email_check(
    target_user_id UUID,
    make_admin BOOLEAN,
    make_professor BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
    target_user_email TEXT;
    current_user_email TEXT;
    admin_emails TEXT[] := ARRAY[
        'guigasprogramador@gmail.com',
        'admin@example.com', 
        'maria.silva@professor.com',
        'joao.santos@professor.com'
    ];
BEGIN
    -- Get current user's role and email
    SELECT role, email INTO current_user_role, current_user_email 
    FROM public.profiles WHERE id = auth.uid();
    
    -- Get target user's email
    SELECT email INTO target_user_email 
    FROM public.profiles WHERE id = target_user_id;
    
    -- Allow if:
    -- 1. Current user is already an admin, OR
    -- 2. Current user is updating their own role and their email is in admin list, OR
    -- 3. Current user's email is in admin list (for initial setup)
    IF NOT (
        current_user_role = 'admin' OR 
        (auth.uid() = target_user_id AND current_user_email = ANY(admin_emails)) OR
        current_user_email = ANY(admin_emails)
    ) THEN
        RAISE EXCEPTION 'Only admins or users with admin emails can change user roles.';
    END IF;

    -- Set admin role
    IF make_admin THEN
        UPDATE public.profiles SET role = 'admin' WHERE id = target_user_id;
    ELSE
        -- If they are not being made an admin, set to student if currently admin
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.set_user_roles_with_email_check(UUID, BOOLEAN, BOOLEAN) TO authenticated;

-- Update the original function to be more permissive for initial setup
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
    current_user_role TEXT;
    current_user_email TEXT;
    admin_emails TEXT[] := ARRAY[
        'guigasprogramador@gmail.com',
        'admin@example.com', 
        'maria.silva@professor.com',
        'joao.santos@professor.com'
    ];
BEGIN
    -- Get current user's role and email
    SELECT role, email INTO current_user_role, current_user_email 
    FROM public.profiles WHERE id = auth.uid();
    
    -- Allow if user is admin OR if user's email is in admin list (for initial setup)
    IF NOT (current_user_role = 'admin' OR current_user_email = ANY(admin_emails)) THEN
        RAISE EXCEPTION 'Only admins or users with admin emails can change user roles.';
    END IF;

    -- Set admin role
    IF make_admin THEN
        UPDATE public.profiles SET role = 'admin' WHERE id = target_user_id;
    ELSE
        -- If they are not being made an admin, set to student if currently admin
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