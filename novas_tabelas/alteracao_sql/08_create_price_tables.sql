-- 1. Create the price_tables table
CREATE TABLE IF NOT EXISTS public.price_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    unit TEXT, -- e.g., per hour, per item
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS policies for price_tables
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all price tables"
ON public.price_tables
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service providers can view their own price tables"
ON public.price_tables
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.service_providers
    WHERE id = price_tables.provider_id AND email = (SELECT email FROM public.users WHERE id = auth.uid())
  )
);
