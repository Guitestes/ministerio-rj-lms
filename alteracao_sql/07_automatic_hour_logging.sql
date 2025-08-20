-- Step 1: Enhance the Database Schema

-- Add a 'status' column to the 'calendar_events' table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'calendar_events'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.calendar_events
        ADD COLUMN status TEXT DEFAULT 'scheduled';
    END IF;
END;
$$;

-- Add a 'status' column to the 'classes' table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'classes'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.classes
        ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END;
$$;

-- Step 2: Create a Database Function for Hour Logging

CREATE OR REPLACE FUNCTION public.log_completed_class_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_id UUID;
    v_course_id UUID;
    v_duration_hours NUMERIC;
BEGIN
    -- Only run the logic if the status is updated to 'completed'
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        -- Get instructor_id and course_id from the class
        SELECT instructor_id, course_id INTO v_instructor_id, v_course_id
        FROM public.classes
        WHERE id = NEW.class_id;

        -- If there's an instructor, proceed
        IF v_instructor_id IS NOT NULL AND v_course_id IS NOT NULL THEN
            -- Calculate the duration of the event in hours
            v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;

            -- Upsert the hours_logged in the courses_taught table
            INSERT INTO public.courses_taught (professor_id, course_id, hours_logged)
            VALUES (v_instructor_id, v_course_id, v_duration_hours)
            ON CONFLICT (professor_id, course_id)
            DO UPDATE SET hours_logged = courses_taught.hours_logged + v_duration_hours;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Implement a Trigger

-- Drop the trigger if it already exists to ensure idempotency
DROP TRIGGER IF EXISTS trigger_log_completed_class_hours ON public.calendar_events;

-- Create the trigger to execute the function after an update on calendar_events
CREATE TRIGGER trigger_log_completed_class_hours
AFTER UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.log_completed_class_hours();

-- Step 4: Automate Class Completion

CREATE OR REPLACE FUNCTION public.update_past_due_classes_status()
RETURNS void AS $$
BEGIN
    -- Find all calendar events that ended in the past and are still 'scheduled'
    -- and update their status to 'completed'.
    UPDATE public.calendar_events
    SET status = 'completed'
    WHERE end_time < NOW() AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;
