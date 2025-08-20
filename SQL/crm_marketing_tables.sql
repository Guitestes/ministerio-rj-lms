-- =====================================================
-- TABELAS PARA CRM E MARKETING
-- Criação das tabelas necessárias para o sistema de CRM e Marketing
-- =====================================================

-- Remover políticas existentes se existirem
DO $$
BEGIN
    -- Remover políticas das tabelas se existirem
    DROP POLICY IF EXISTS "Admin can manage leads" ON public.leads;
    DROP POLICY IF EXISTS "Admin can manage lead interactions" ON public.lead_interactions;
    DROP POLICY IF EXISTS "Admin can manage marketing campaigns" ON public.marketing_campaigns;
    DROP POLICY IF EXISTS "Admin can manage campaign metrics" ON public.campaign_metrics;
    DROP POLICY IF EXISTS "Admin can manage email lists" ON public.email_lists;
    DROP POLICY IF EXISTS "Admin can manage email templates" ON public.email_templates;
    DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
    DROP POLICY IF EXISTS "Admins can manage marketing campaigns" ON public.marketing_campaigns;
    DROP POLICY IF EXISTS "Admins can manage campaign metrics" ON public.campaign_metrics;
    DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
    DROP POLICY IF EXISTS "Admins can manage email lists" ON public.email_lists;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros se as políticas não existirem
        NULL;
END $$;

-- Remover tabelas existentes se existirem (em ordem correta devido às dependências)
DROP TABLE IF EXISTS public.campaign_metrics CASCADE;
DROP TABLE IF EXISTS public.lead_interactions CASCADE;
DROP TABLE IF EXISTS public.email_list_subscribers CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.email_lists CASCADE;
DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- Tabela para leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  score INTEGER DEFAULT 0,
  company TEXT,
  position TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  conversion_date TIMESTAMP WITH TIME ZONE,
  converted_to_user_id UUID REFERENCES public.profiles(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para interações com leads
CREATE TABLE public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'demo', 'proposal', 'follow_up')),
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para campanhas de marketing
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'social_media', 'google_ads', 'facebook_ads', 'content', 'event')),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  budget DECIMAL(10,2),
  target_audience TEXT,
  goals TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de campanhas
CREATE TABLE public.campaign_metrics (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date)
);

-- Tabela para listas de email
CREATE TABLE public.email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para templates de email
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'marketing' CHECK (type IN ('marketing', 'transactional', 'newsletter')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leads - apenas admins podem gerenciar
CREATE POLICY "Admin can manage leads" ON public.leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para interações com leads
CREATE POLICY "Admin can manage lead interactions" ON public.lead_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para campanhas de marketing
CREATE POLICY "Admin can manage marketing campaigns" ON public.marketing_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para métricas de campanhas
CREATE POLICY "Admin can manage campaign metrics" ON public.campaign_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para listas de email
CREATE POLICY "Admin can manage email lists" ON public.email_lists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para templates de email
CREATE POLICY "Admin can manage email templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON public.email_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_leads_source ON public.leads(source);

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_created_by ON public.lead_interactions(created_by);
CREATE INDEX idx_lead_interactions_created_at ON public.lead_interactions(created_at);

CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns(type);
CREATE INDEX idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX idx_marketing_campaigns_start_date ON public.marketing_campaigns(start_date);

CREATE INDEX idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_metric_date ON public.campaign_metrics(metric_date);

CREATE INDEX idx_email_lists_created_by ON public.email_lists(created_by);
CREATE INDEX idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX idx_email_templates_type ON public.email_templates(type);

-- Inserir alguns dados de exemplo
INSERT INTO public.email_lists (name, description, created_by)
SELECT 
  'Lista Geral',
  'Lista principal de contatos para marketing',
  id
FROM public.profiles 
WHERE role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (name, subject, content, type, created_by)
SELECT 
  'Template Boas-vindas',
  'Bem-vindo à OneEduca!',
  '<h1>Bem-vindo!</h1><p>Obrigado por se juntar à nossa plataforma de educação.</p>',
  'marketing',
  id
FROM public.profiles 
WHERE role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;