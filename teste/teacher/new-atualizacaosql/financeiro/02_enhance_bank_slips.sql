-- Script para melhorar a tabela bank_slips
-- Adiciona funcionalidades de email e processamento em lote

-- Adicionar colunas para funcionalidades de email e lote
ALTER TABLE bank_slips 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES financial_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'bank_slip' CHECK (payment_method IN ('bank_slip', 'pix', 'credit_card', 'debit_card')),
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_integration_id UUID REFERENCES bank_integrations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Atualizar valores existentes para final_amount
UPDATE bank_slips 
SET final_amount = amount + late_fee - discount_amount 
WHERE final_amount IS NULL;

-- Adicionar constraint para final_amount (remover se existir)
ALTER TABLE bank_slips 
DROP CONSTRAINT IF EXISTS check_final_amount_positive;

ALTER TABLE bank_slips 
ADD CONSTRAINT check_final_amount_positive CHECK (final_amount > 0);

-- Criar índices adicionais
CREATE INDEX IF NOT EXISTS idx_bank_slips_batch_id ON bank_slips(batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_slips_email_sent ON bank_slips(email_sent);
CREATE INDEX IF NOT EXISTS idx_bank_slips_payment_method ON bank_slips(payment_method);
CREATE INDEX IF NOT EXISTS idx_bank_slips_due_date ON bank_slips(due_date);
CREATE INDEX IF NOT EXISTS idx_bank_slips_external_id ON bank_slips(external_id);

-- Função para calcular valor final do boleto
CREATE OR REPLACE FUNCTION calculate_bank_slip_final_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular juros se estiver em atraso
    IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
        NEW.late_fee = COALESCE(NEW.late_fee, 0) + 
                      (NEW.amount * COALESCE(NEW.interest_rate, 0) * 
                       (CURRENT_DATE - NEW.due_date)::INTEGER);
    END IF;
    
    -- Calcular valor final
    NEW.final_amount = NEW.amount + COALESCE(NEW.late_fee, 0) - COALESCE(NEW.discount_amount, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular valor final automaticamente (remover se existir)
DROP TRIGGER IF EXISTS calculate_bank_slip_amount_trigger ON bank_slips;

CREATE TRIGGER calculate_bank_slip_amount_trigger
    BEFORE INSERT OR UPDATE ON bank_slips
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bank_slip_final_amount();

-- Função para envio de boletos por email em lote
CREATE OR REPLACE FUNCTION send_bank_slips_batch(
    p_batch_id UUID,
    p_email_template TEXT DEFAULT NULL
)
RETURNS TABLE(
    slip_id UUID,
    student_email TEXT,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    slip_record RECORD;
    email_subject TEXT;
    email_body TEXT;
BEGIN
    -- Template padrão se não fornecido
    IF p_email_template IS NULL THEN
        p_email_template = 'Seu boleto bancário está disponível. Valor: R$ {amount}, Vencimento: {due_date}';
    END IF;
    
    FOR slip_record IN 
        SELECT bs.id, bs.student_id, bs.amount, bs.due_date, bs.barcode,
               p.email, p.name
        FROM bank_slips bs
        JOIN profiles p ON p.id = bs.student_id
        WHERE bs.batch_id = p_batch_id
        AND bs.email_sent = FALSE
    LOOP
        BEGIN
            -- Preparar conteúdo do email
            email_subject = 'Boleto Bancário - Vencimento ' || slip_record.due_date;
            email_body = REPLACE(REPLACE(p_email_template, '{amount}', slip_record.amount::TEXT), '{due_date}', slip_record.due_date::TEXT);
            
            -- Aqui seria a integração com serviço de email
            -- Por enquanto, apenas marcar como enviado
            UPDATE bank_slips 
            SET email_sent = TRUE, email_sent_at = NOW()
            WHERE id = slip_record.id;
            
            RETURN QUERY SELECT slip_record.id, slip_record.email, 'sent'::TEXT, NULL::TEXT;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT slip_record.id, slip_record.email, 'failed'::TEXT, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar boletos em lote
CREATE OR REPLACE FUNCTION generate_bank_slips_batch(
    p_student_ids UUID[],
    p_amount NUMERIC,
    p_due_date DATE,
    p_description TEXT DEFAULT 'Mensalidade'
)
RETURNS UUID AS $$
DECLARE
    batch_id UUID;
    student_id UUID;
    slip_count INTEGER := 0;
BEGIN
    -- Criar lote
    INSERT INTO financial_batches (batch_type, description, total_records)
    VALUES ('bank_slips', 'Geração de boletos em lote', array_length(p_student_ids, 1))
    RETURNING id INTO batch_id;
    
    -- Gerar boletos para cada estudante
    FOREACH student_id IN ARRAY p_student_ids
    LOOP
        INSERT INTO bank_slips (
            student_id, amount, due_date, status, batch_id,
            barcode, created_at
        ) VALUES (
            student_id, p_amount, p_due_date, 'pending', batch_id,
            'BARCODE_' || EXTRACT(epoch FROM NOW())::BIGINT::TEXT || '_' || student_id::TEXT,
            NOW()
        );
        
        slip_count := slip_count + 1;
    END LOOP;
    
    -- Atualizar lote
    UPDATE financial_batches 
    SET processed_records = slip_count, status = 'completed', completed_at = NOW()
    WHERE id = batch_id;
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql;