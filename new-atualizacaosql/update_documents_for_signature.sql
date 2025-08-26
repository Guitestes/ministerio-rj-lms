-- Atualização da tabela documents para incluir assinatura digital

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS digital_signature text;

COMMENT ON COLUMN documents.digital_signature IS 'Assinatura digital do documento para verificação de autenticidade';