-- Atualizações para Módulo de Gestão Acadêmica

-- Adicionar coluna para links de documentos em planos de aula (assumindo tabela lesson_plans existe)
ALTER TABLE lesson_plans ADD COLUMN document_links TEXT[];

-- Criar tabela para formulários de avaliação personalizados
CREATE TABLE custom_evaluation_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id),
    form_name VARCHAR(255) NOT NULL,
    form_content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar coluna para agendamento de salas no calendário (assumindo calendar_events existe)
-- ALTER TABLE calendar_events ADD COLUMN room_id UUID REFERENCES rooms(id); // Comentado pois a coluna já existe

-- Tabela para integração com Moodle
CREATE TABLE moodle_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id),
    moodle_user_id VARCHAR(255),
    course_id UUID REFERENCES courses(id),
    auto_enroll BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP
);

-- Função para relatórios avançados (ex: quantitativo de certificados)
CREATE OR REPLACE FUNCTION get_certificate_count(course_id UUID) RETURNS INTEGER AS $$
SELECT COUNT(*) FROM certificates WHERE course_id = $1;
$$ LANGUAGE SQL;

-- Tabela para hospedagem de material audiovisual
CREATE TABLE audiovisual_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id),
    file_url VARCHAR(512) NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para relatórios de turmas
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- Política de acesso
CREATE POLICY "Enable read access for authenticated users" ON audiovisual_materials FOR SELECT TO authenticated USING (true);