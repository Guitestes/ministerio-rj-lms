-- Atualizações para Módulo de Gestão Administrativa

/*
-- Tabela para cadastro completo de professores
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    professional_data JSONB,
    academic_data JSONB,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

/*
-- Tabela para documentos com assinatura digital
CREATE TABLE signed_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id),
    document_type VARCHAR(255),
    content TEXT,
    digital_signature TEXT,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

-- Adicionar colunas para controle de trancamento/cancelamento em matrículas (assumindo tabela enrollments existe)
-- ALTER TABLE enrollments ADD COLUMN status VARCHAR(50) DEFAULT 'active';
-- ALTER TABLE enrollments ADD COLUMN lock_date DATE;
-- ALTER TABLE enrollments ADD COLUMN cancellation_date DATE;


-- Tabela para sistema de solicitações administrativas
/*
CREATE TABLE admin_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    request_type VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/
-- Função para relatórios de evasão
-- ALTER TYPE enrollment_status ADD VALUE 'dropped';
COMMIT;
CREATE OR REPLACE FUNCTION get_evasion_report(course_id UUID) RETURNS TABLE(student_id UUID, dropout_date DATE) AS $$
SELECT user_id, cancellation_date FROM enrollments WHERE course_id = $1 AND status = 'dropped';
$$ LANGUAGE SQL;

/*
-- Função para relatórios de frequência
CREATE OR REPLACE FUNCTION get_attendance_report(student_id UUID, course_id UUID) RETURNS INTEGER AS $$
SELECT COUNT(*) FROM attendances WHERE student_id = $1 AND course_id = $2 AND present = TRUE;
$$ LANGUAGE SQL;
*/

-- Índice para relatórios
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Política de acesso
CREATE POLICY "Enable insert for authenticated users" ON admin_requests FOR INSERT TO authenticated WITH CHECK (true);