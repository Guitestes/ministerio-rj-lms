-- ===================================================================
-- MÓDULO DE GESTÃO DE MARKETING E CRM
-- ===================================================================

-- 1. Tabela de Leads/Prospects
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT, -- Google Ads, Facebook, Indicação, Site, etc.
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    score INTEGER DEFAULT 0, -- Lead scoring
    company TEXT,
    position TEXT,
    notes TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    conversion_date TIMESTAMPTZ,
    converted_to_user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Campos para tracking de campanha
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT
);

-- 2. Tabela de Interações com Leads/Clientes
CREATE TABLE IF NOT EXISTS public.lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id), -- Para clientes já convertidos
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'demo', 'proposal', 'follow_up')),
    subject TEXT NOT NULL,
    description TEXT,
    outcome TEXT,
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campanhas de Marketing
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'social_media', 'google_ads', 'facebook_ads', 'content', 'event')),
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    budget DECIMAL(10,2),
    target_audience TEXT,
    goals TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Métricas de Campanhas
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    enrollments INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campaign_id, metric_date)
);

-- 5. Templates de Email/Newsletter
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_type TEXT CHECK (template_type IN ('newsletter', 'welcome', 'course_reminder', 'promotional', 'follow_up')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Listas de Email Marketing
CREATE TABLE IF NOT EXISTS public.email_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    list_type TEXT CHECK (list_type IN ('students', 'prospects', 'alumni', 'teachers', 'custom')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Contatos nas Listas de Email
CREATE TABLE IF NOT EXISTS public.email_list_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    lead_id UUID REFERENCES public.leads(id),
    user_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,

    UNIQUE(list_id, email)
);

-- 8. Campanhas de Email
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id),
    list_id UUID NOT NULL REFERENCES public.email_lists(id),
    html_content TEXT NOT NULL,
    text_content TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tracking de Email (Opens, Clicks, etc.)
CREATE TABLE IF NOT EXISTS public.email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
    event_data JSONB,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

-- 10. Segmentos de Clientes
CREATE TABLE IF NOT EXISTS public.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Critérios de segmentação em JSON
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- POLÍTICAS RLS
-- ===================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

-- Políticas para administradores (acesso total)
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage lead interactions" ON public.lead_interactions FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage marketing campaigns" ON public.marketing_campaigns FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage campaign metrics" ON public.campaign_metrics FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage email lists" ON public.email_lists FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage email list contacts" ON public.email_list_contacts FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage email tracking" ON public.email_tracking FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage customer segments" ON public.customer_segments FOR ALL USING (public.is_admin(auth.uid()));

-- ===================================================================
-- FUNÇÕES UTILITÁRIAS
-- ===================================================================

-- Função para calcular lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    lead_record RECORD;
    interaction_count INTEGER;
BEGIN
    -- Buscar dados do lead
    SELECT * INTO lead_record FROM public.leads WHERE id = lead_uuid;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Pontuação baseada na origem
    CASE lead_record.source
        WHEN 'Google Ads' THEN score := score + 10;
        WHEN 'Facebook Ads' THEN score := score + 8;
        WHEN 'Indicação' THEN score := score + 15;
        WHEN 'Site' THEN score := score + 5;
        ELSE score := score + 3;
    END CASE;

    -- Pontuação baseada em interações
    SELECT COUNT(*) INTO interaction_count 
    FROM public.lead_interactions 
    WHERE lead_id = lead_uuid;

    score := score + (interaction_count * 5);

    -- Atualizar o score no banco
    UPDATE public.leads SET score = score WHERE id = lead_uuid;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Função para converter lead em usuário
CREATE OR REPLACE FUNCTION convert_lead_to_user(
    lead_uuid UUID,
    user_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar o lead como convertido
    UPDATE public.leads 
    SET 
        status = 'converted',
        conversion_date = NOW(),
        converted_to_user_id = user_uuid,
        updated_at = NOW()
    WHERE id = lead_uuid;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS
-- ===================================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_leads
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_marketing_campaigns
    BEFORE UPDATE ON public.marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_email_templates
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_customer_segments
    BEFORE UPDATE ON public.customer_segments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ===================================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON public.campaign_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON public.email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON public.email_tracking(event_type);