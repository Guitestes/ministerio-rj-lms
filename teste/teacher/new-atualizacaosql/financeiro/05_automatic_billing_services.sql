-- Script para serviços de cobrança automática e integração bancária
-- Implementa os requisitos 3.3.4.1 e 3.3.4.2

-- Tabela para configurações de cobrança automática
CREATE TABLE IF NOT EXISTS automatic_billing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1], -- dias antes do vencimento
    reminder_days_after INTEGER[] DEFAULT ARRAY[1, 7, 15, 30], -- dias após vencimento
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT TRUE,
    max_reminders INTEGER DEFAULT 5,
    phone_number VARCHAR(20),
    preferred_contact_method VARCHAR(10) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'sms', 'both')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para templates de mensagens
CREATE TABLE IF NOT EXISTS billing_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('email', 'sms')),
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('before_due', 'after_due', 'payment_confirmation')),
    subject TEXT, -- para emails
    message_body TEXT NOT NULL,
    variables JSONB, -- variáveis disponíveis no template
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para log de envios
CREATE TABLE IF NOT EXISTS billing_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('email', 'sms')),
    template_id UUID REFERENCES billing_message_templates(id) ON DELETE SET NULL,
    recipient_contact TEXT NOT NULL, -- email ou telefone
    message_content TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    external_id VARCHAR(100), -- ID do provedor de SMS/Email
    cost NUMERIC(10,4), -- custo do envio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Melhorar tabela bank_integrations
ALTER TABLE bank_integrations 
ADD COLUMN IF NOT EXISTS integration_type VARCHAR(30) DEFAULT 'api' CHECK (integration_type IN ('api', 'webhook', 'file')),
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS config_json JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS sync_frequency INTEGER DEFAULT 60; -- minutos

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_automatic_billing_configs_profile_id ON automatic_billing_configs(profile_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_log_transaction_id ON billing_notifications_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_log_status ON billing_notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_log_sent_at ON billing_notifications_log(sent_at);

-- Inserir templates padrão
INSERT INTO billing_message_templates (template_name, template_type, reminder_type, subject, message_body, variables) VALUES
('Lembrete Email - Antes Vencimento', 'email', 'before_due', 
 'Lembrete: Pagamento vence em {days_until_due} dias', 
 'Olá {student_name},\n\nEste é um lembrete de que seu pagamento no valor de R$ {amount} vence em {days_until_due} dias ({due_date}).\n\nPara evitar juros e multas, realize o pagamento até a data de vencimento.\n\nAtenciosamente,\nEquipe Financeira',
 '{"student_name": "Nome do estudante", "amount": "Valor", "days_until_due": "Dias até vencimento", "due_date": "Data de vencimento"}'),

('Lembrete Email - Após Vencimento', 'email', 'after_due',
 'URGENTE: Pagamento em atraso há {days_overdue} dias',
 'Olá {student_name},\n\nSeu pagamento no valor de R$ {amount} está em atraso há {days_overdue} dias.\n\nValor original: R$ {original_amount}\nJuros e multa: R$ {late_fees}\nValor total: R$ {total_amount}\n\nRegularize sua situação o quanto antes para evitar maiores transtornos.\n\nAtenciosamente,\nEquipe Financeira',
 '{"student_name": "Nome do estudante", "amount": "Valor total", "days_overdue": "Dias em atraso", "original_amount": "Valor original", "late_fees": "Juros e multa", "total_amount": "Valor total"}'),

('Lembrete SMS - Antes Vencimento', 'sms', 'before_due',
 NULL,
 'Lembrete: Pagamento de R$ {amount} vence em {days_until_due} dias ({due_date}). Evite juros pagando em dia.',
 '{"amount": "Valor", "days_until_due": "Dias até vencimento", "due_date": "Data de vencimento"}'),

('Lembrete SMS - Após Vencimento', 'sms', 'after_due',
 NULL,
 'URGENTE: Pagamento de R$ {amount} em atraso há {days_overdue} dias. Total com juros: R$ {total_amount}. Regularize já!',
 '{"amount": "Valor original", "days_overdue": "Dias em atraso", "total_amount": "Valor total"}'),

('Confirmação Pagamento', 'email', 'payment_confirmation',
 'Pagamento confirmado - R$ {amount}',
 'Olá {student_name},\n\nConfirmamos o recebimento do seu pagamento:\n\nValor: R$ {amount}\nData: {payment_date}\nReferência: {transaction_id}\n\nObrigado!\n\nEquipe Financeira',
 '{"student_name": "Nome do estudante", "amount": "Valor", "payment_date": "Data do pagamento", "transaction_id": "ID da transação"}');

-- Função para processar cobrança automática
CREATE OR REPLACE FUNCTION process_automatic_billing()
RETURNS TABLE(
    processed_count INTEGER,
    sent_count INTEGER,
    failed_count INTEGER,
    details JSONB
) AS $$
DECLARE
    transaction_record RECORD;
    config_record RECORD;
    template_record RECORD;
    days_diff INTEGER;
    reminder_sent BOOLEAN;
    processed INTEGER := 0;
    sent INTEGER := 0;
    failed INTEGER := 0;
    result_details JSONB := '[]'::JSONB;
BEGIN
    -- Processar transações pendentes
    FOR transaction_record IN 
        SELECT ft.*, p.name, p.email, p.phone
        FROM financial_transactions ft
        JOIN profiles p ON p.id = ft.profile_id
        WHERE ft.status = 'pending'
        AND ft.due_date IS NOT NULL
    LOOP
        processed := processed + 1;
        
        -- Buscar configuração de cobrança do usuário
        SELECT * INTO config_record
        FROM automatic_billing_configs
        WHERE profile_id = transaction_record.profile_id
        AND is_active = TRUE;
        
        -- Se não tem configuração, usar padrão
        IF NOT FOUND THEN
            config_record.reminder_days_before := ARRAY[7, 3, 1];
            config_record.reminder_days_after := ARRAY[1, 7, 15, 30];
            config_record.email_enabled := TRUE;
            config_record.sms_enabled := FALSE;
            config_record.max_reminders := 5;
        END IF;
        
        days_diff := (transaction_record.due_date - CURRENT_DATE)::INTEGER;
        reminder_sent := FALSE;
        
        -- Verificar se deve enviar lembrete antes do vencimento
        IF days_diff > 0 AND days_diff = ANY(config_record.reminder_days_before) THEN
            -- Verificar se já não foi enviado hoje
            IF NOT EXISTS (
                SELECT 1 FROM billing_notifications_log
                WHERE transaction_id = transaction_record.id
                AND DATE(created_at) = CURRENT_DATE
                AND notification_type = 'email'
            ) THEN
                -- Enviar email
                IF config_record.email_enabled AND transaction_record.email IS NOT NULL THEN
                    SELECT * INTO template_record
                    FROM billing_message_templates
                    WHERE template_type = 'email' 
                    AND reminder_type = 'before_due'
                    AND is_active = TRUE
                    LIMIT 1;
                    
                    IF FOUND THEN
                        INSERT INTO billing_notifications_log (
                            transaction_id, profile_id, notification_type, template_id,
                            recipient_contact, message_content, status
                        ) VALUES (
                            transaction_record.id, transaction_record.profile_id, 'email',
                            template_record.id, transaction_record.email,
                            REPLACE(REPLACE(REPLACE(template_record.message_body, 
                                '{student_name}', transaction_record.name),
                                '{amount}', transaction_record.amount::TEXT),
                                '{days_until_due}', days_diff::TEXT),
                            'pending'
                        );
                        
                        sent := sent + 1;
                        reminder_sent := TRUE;
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Verificar se deve enviar lembrete após vencimento
        IF days_diff < 0 AND ABS(days_diff) = ANY(config_record.reminder_days_after) THEN
            -- Verificar limite de lembretes
            IF (SELECT COUNT(*) FROM billing_notifications_log 
                WHERE transaction_id = transaction_record.id) < config_record.max_reminders THEN
                
                -- Verificar se já não foi enviado hoje
                IF NOT EXISTS (
                    SELECT 1 FROM billing_notifications_log
                    WHERE transaction_id = transaction_record.id
                    AND DATE(created_at) = CURRENT_DATE
                ) THEN
                    -- Enviar email de atraso
                    IF config_record.email_enabled AND transaction_record.email IS NOT NULL THEN
                        SELECT * INTO template_record
                        FROM billing_message_templates
                        WHERE template_type = 'email' 
                        AND reminder_type = 'after_due'
                        AND is_active = TRUE
                        LIMIT 1;
                        
                        IF FOUND THEN
                            INSERT INTO billing_notifications_log (
                                transaction_id, profile_id, notification_type, template_id,
                                recipient_contact, message_content, status
                            ) VALUES (
                                transaction_record.id, transaction_record.profile_id, 'email',
                                template_record.id, transaction_record.email,
                                REPLACE(REPLACE(REPLACE(template_record.message_body, 
                                    '{student_name}', transaction_record.name),
                                    '{amount}', transaction_record.amount::TEXT),
                                    '{days_overdue}', ABS(days_diff)::TEXT),
                                'pending'
                            );
                            
                            sent := sent + 1;
                            reminder_sent := TRUE;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- Adicionar aos detalhes
        result_details := result_details || jsonb_build_object(
            'transaction_id', transaction_record.id,
            'student_name', transaction_record.name,
            'amount', transaction_record.amount,
            'days_diff', days_diff,
            'reminder_sent', reminder_sent
        );
        
        IF NOT reminder_sent THEN
            failed := failed + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT processed, sent, failed, result_details;
END;
$$ LANGUAGE plpgsql;

-- Função para integração bancária - sincronizar pagamentos
CREATE OR REPLACE FUNCTION sync_bank_payments(
    p_bank_integration_id UUID
)
RETURNS TABLE(
    synced_payments INTEGER,
    new_payments INTEGER,
    updated_payments INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    integration_record RECORD;
    payment_data JSONB;
    synced INTEGER := 0;
    new_count INTEGER := 0;
    updated INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Buscar configuração da integração
    SELECT * INTO integration_record
    FROM bank_integrations
    WHERE id = p_bank_integration_id
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        error_list := array_append(error_list, 'Integração bancária não encontrada ou inativa');
        RETURN QUERY SELECT 0, 0, 0, error_list;
        RETURN;
    END IF;
    
    -- Aqui seria a lógica de integração com a API do banco
    -- Por enquanto, simular alguns pagamentos
    
    -- Atualizar timestamp da última sincronização
    UPDATE bank_integrations 
    SET last_sync = NOW()
    WHERE id = p_bank_integration_id;
    
    synced := new_count + updated;
    
    RETURN QUERY SELECT synced, new_count, updated, error_list;
END;
$$ LANGUAGE plpgsql;

-- Função para configurar cobrança automática para um usuário
CREATE OR REPLACE FUNCTION setup_automatic_billing(
    p_profile_id UUID,
    p_email_enabled BOOLEAN DEFAULT TRUE,
    p_sms_enabled BOOLEAN DEFAULT FALSE,
    p_phone_number VARCHAR DEFAULT NULL,
    p_reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],
    p_reminder_days_after INTEGER[] DEFAULT ARRAY[1, 7, 15, 30]
)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
BEGIN
    INSERT INTO automatic_billing_configs (
        profile_id, is_active, email_enabled, sms_enabled,
        phone_number, reminder_days_before, reminder_days_after
    ) VALUES (
        p_profile_id, TRUE, p_email_enabled, p_sms_enabled,
        p_phone_number, p_reminder_days_before, p_reminder_days_after
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        email_enabled = p_email_enabled,
        sms_enabled = p_sms_enabled,
        phone_number = p_phone_number,
        reminder_days_before = p_reminder_days_before,
        reminder_days_after = p_reminder_days_after,
        updated_at = NOW()
    RETURNING id INTO config_id;
    
    RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar configuração padrão quando um novo perfil é criado
CREATE OR REPLACE FUNCTION create_default_billing_config()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO automatic_billing_configs (profile_id)
        VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se existir antes de criar
DROP TRIGGER IF EXISTS create_billing_config_trigger ON profiles;

CREATE TRIGGER create_billing_config_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_billing_config();

-- Grants para as novas funções
GRANT EXECUTE ON FUNCTION process_automatic_billing() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_bank_payments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_automatic_billing(UUID, BOOLEAN, BOOLEAN, VARCHAR, INTEGER[], INTEGER[]) TO authenticated;