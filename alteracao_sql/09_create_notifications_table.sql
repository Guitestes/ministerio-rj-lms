-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    type TEXT,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
ON public.notifications
FOR ALL USING (
  auth.uid() = user_id
);

CREATE POLICY "Admins can see all notifications"
ON public.notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
