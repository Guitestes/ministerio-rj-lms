-- Atualizações para Módulo de Marketing

-- Tabela para Sistema de CRM completo
CREATE TABLE crm_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'lead',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para Gestão de newsletters
CREATE TABLE newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    send_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para associação de newsletters com contatos
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES crm_contacts(id),
    newsletter_id UUID REFERENCES newsletters(id),
    sent_at TIMESTAMP
);

-- Tabela para Controle de mídias para captação de alunos
CREATE TABLE marketing_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_type VARCHAR(50) CHECK (media_type IN ('social', 'email', 'ad')),
    content TEXT,
    target_audience VARCHAR(255),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Função para relatórios de captação
CREATE OR REPLACE FUNCTION get_lead_count(start_date DATE, end_date DATE) RETURNS INTEGER AS $$
SELECT COUNT(*) FROM crm_contacts WHERE created_at BETWEEN $1 AND $2 AND status = 'lead';
$$ LANGUAGE SQL;

-- Índice para CRM
CREATE INDEX idx_crm_email ON crm_contacts(email);

-- Política de acesso
CREATE POLICY "Enable all for admins" ON crm_contacts USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));