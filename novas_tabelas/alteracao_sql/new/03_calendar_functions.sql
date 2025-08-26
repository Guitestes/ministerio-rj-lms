-- Function to get a list of potential targets (classes or individual students) for an event within a specific course.
CREATE OR REPLACE FUNCTION public.get_event_targets_for_course(p_course_id UUID)
RETURNS TABLE (
    target_id UUID,
    target_name TEXT,
    target_type TEXT -- 'class' or 'student'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function should only be callable by an admin.
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- Return all classes associated with the course
    RETURN QUERY
    SELECT
        c.id AS target_id,
        c.name AS target_name,
        'class' AS target_type
    FROM
        public.classes c
    WHERE
        c.course_id = p_course_id;

    -- Return all students enrolled in any class of that course
    RETURN QUERY
    SELECT
        p.id AS target_id,
        p.name AS target_name,
        'student' AS target_type
    FROM
        public.profiles p
    JOIN
        public.enrollments e ON p.id = e.user_id
    JOIN
        public.classes c ON e.class_id = c.id
    WHERE
        c.course_id = p_course_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_event_targets_for_course(UUID) TO authenticated;
