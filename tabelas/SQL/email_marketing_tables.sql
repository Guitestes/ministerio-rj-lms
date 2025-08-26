-- Tabelas para sistema de email marketing e logs

-- Tabela para logs de emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipients TEXT[] NOT NULL, -- Array de emails dos destinatários
  subject TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  campaign_id UUID REFERENCES marketing_campaigns(id),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para assinantes de listas de email
CREATE TABLE IF NOT EXISTS email_list_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_list_id UUID REFERENCES email_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_list_id, email)
);

-- Tabela para métricas de email (aberturas, cliques, etc.)
CREATE TABLE IF NOT EXISTS email_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'spam', 'unsubscribed')),
  event_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_email_list_id ON email_list_subscribers(email_list_id);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_email ON email_list_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_status ON email_list_subscribers(status);

CREATE INDEX IF NOT EXISTS idx_email_metrics_email_log_id ON email_metrics(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_metrics_recipient_email ON email_metrics(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_metrics_event_type ON email_metrics(event_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_timestamp ON email_metrics(timestamp);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_list_subscribers_updated_at BEFORE UPDATE ON email_list_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_list_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;

-- Política para email_logs - apenas admins podem ver todos os logs
CREATE POLICY "Admin can view all email logs" ON email_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Política para email_list_subscribers - apenas admins podem gerenciar
CREATE POLICY "Admin can manage email list subscribers" ON email_list_subscribers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Política para email_metrics - apenas admins podem ver métricas
CREATE POLICY "Admin can view email metrics" ON email_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Inserir alguns dados de exemplo para testes
INSERT INTO email_list_subscribers (email_list_id, email, name, status)
SELECT 
    el.id,
    'teste' || generate_series(1, 5) || '@exemplo.com',
    'Usuário Teste ' || generate_series(1, 5),
    'active'
FROM email_lists el
LIMIT 1
ON CONFLICT (email_list_id, email) DO NOTHING;

-- Atualizar contador de assinantes nas listas
UPDATE email_lists 
SET subscriber_count = (
    SELECT COUNT(*) 
    FROM email_list_subscribers 
    WHERE email_list_subscribers.email_list_id = email_lists.id 
    AND email_list_subscribers.status = 'active'
);

COMMIT;