-- Drop existing policies to avoid conflicts
-- We will recreate them with more robust logic
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can create their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can modify their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Professors can create courses" ON public.courses;
DROP POLICY IF EXISTS "Professors can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Professors can delete their own courses" ON public.courses;
DROP POLICY IF EXISTS "Professors can create modules for their courses" ON public.modules;
DROP POLICY IF EXISTS "Professors can update modules of their courses" ON public.modules;
DROP POLICY IF EXISTS "Professors can delete modules of their courses" ON public.modules;
DROP POLICY IF EXISTS "Professors can create lessons for their modules" ON public.lessons;
DROP POLICY IF EXISTS "Professors can update lessons of their modules" ON public.lessons;
DROP POLICY IF EXISTS "Professors can delete lessons of their modules" ON public.lessons;

-- Helper function to check for admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (is_admin());
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courses
CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (is_admin());
CREATE POLICY "Courses are publicly visible" ON public.courses
  FOR SELECT USING (true);
CREATE POLICY "Professors can manage their own courses" ON public.courses
  FOR ALL USING (auth.uid() = professor_id);

-- Modules
CREATE POLICY "Admins can manage all modules" ON public.modules
  FOR ALL USING (is_admin());
CREATE POLICY "Modules are publicly visible" ON public.modules
  FOR SELECT USING (true);
CREATE POLICY "Professors can manage modules for their courses" ON public.modules
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = course_id AND professor_id = auth.uid()
  ));

-- Lessons
CREATE POLICY "Admins can manage all lessons" ON public.lessons
  FOR ALL USING (is_admin());
CREATE POLICY "Lessons are publicly visible" ON public.lessons
  FOR SELECT USING (true);
CREATE POLICY "Professors can manage lessons for their courses" ON public.lessons
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON m.course_id = c.id
    WHERE m.id = module_id AND c.professor_id = auth.uid()
  ));

-- Enrollments
CREATE POLICY "Admins can manage all enrollments" ON public.enrollments
  FOR ALL USING (is_admin());
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lesson Progress
CREATE POLICY "Admins can manage all lesson progress" ON public.lesson_progress
  FOR ALL USING (is_admin());
CREATE POLICY "Users can manage their own lesson progress" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id);

-- Certificates
CREATE POLICY "Admins can manage all certificates" ON public.certificates
  FOR ALL USING (is_admin());
CREATE POLICY "Users can view their own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (is_admin());
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Course Prerequisites
CREATE POLICY "Admins can manage all course prerequisites" ON public.course_prerequisites
  FOR ALL USING (is_admin());
CREATE POLICY "Course prerequisites are publicly visible" ON public.course_prerequisites
  FOR SELECT USING (true);
CREATE POLICY "Professors can manage prerequisites for their courses" ON public.course_prerequisites
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses
    WHERE (id = course_id OR id = prerequisite_id) AND professor_id = auth.uid()
  ));