-- Add the missing course_id column to the enrollments table
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS course_id UUID;

-- Add the foreign key constraint to the course_id column
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id)
REFERENCES public.courses(id) ON DELETE CASCADE;