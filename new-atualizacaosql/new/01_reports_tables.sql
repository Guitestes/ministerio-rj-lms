-- Criação de tabelas adicionais para sistema de relatórios avançados
-- Data: 2024
-- Descrição: Estruturas necessárias para atender aos requisitos de relatórios

-- Tabela para armazenar tipos de cargos dos usuários
CREATE TABLE IF NOT EXISTS user_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50), -- membros, servidores, extraquadros, terceirizados, estagiários, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna position_id na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES user_positions(id);

-- Tabela para armazenar segmentos de cursos (capacitação, pós-graduação)
CREATE TABLE IF NOT EXISTS course_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna segment_id na tabela courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES course_segments(id);

-- Tabela para armazenar avaliações institucionais
CREATE TABLE IF NOT EXISTS institutional_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    class_id UUID REFERENCES classes(id),
    user_id UUID REFERENCES profiles(id),
    evaluation_type VARCHAR(50), -- 'student', 'professor', 'institution'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para integração com Moodle - trabalhos acadêmicos
CREATE TABLE IF NOT EXISTS moodle_academic_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moodle_course_id INTEGER,
    moodle_assignment_id INTEGER,
    course_id UUID REFERENCES courses(id),
    user_id UUID REFERENCES profiles(id),
    title TEXT,
    submission_date TIMESTAMP WITH TIME ZONE,
    grade NUMERIC(5,2),
    status VARCHAR(50),
    origin VARCHAR(50), -- 'internal', 'moodle'
    nature VARCHAR(50), -- 'assignment', 'project', 'thesis', etc.
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para integração com Moodle - certificados
CREATE TABLE IF NOT EXISTS moodle_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moodle_course_id INTEGER,
    moodle_certificate_id INTEGER,
    course_id UUID REFERENCES courses(id),
    user_id UUID REFERENCES profiles(id),
    certificate_name TEXT,
    issue_date TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    origin VARCHAR(50) DEFAULT 'moodle',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar relatórios personalizados
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(100),
    filters JSONB, -- Armazena filtros aplicados
    query_config JSONB, -- Configuração da consulta
    created_by UUID REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de execução de relatórios
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES custom_reports(id),
    executed_by UUID REFERENCES profiles(id),
    execution_time INTERVAL,
    record_count INTEGER,
    filters_applied JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir cargos padrão
INSERT INTO user_positions (name, description, category) VALUES
('Membro', 'Membro da instituição', 'membros'),
('Servidor Público', 'Servidor público da instituição', 'servidores'),
('Extraquadro', 'Funcionário extraquadro', 'extraquadros'),
('Terceirizado', 'Funcionário terceirizado', 'terceirizados'),
('Estagiário Jurídico', 'Estagiário da área jurídica', 'estagiarios'),
('Estagiário Não Jurídico', 'Estagiário de outras áreas', 'estagiarios'),
('Residente Jurídico', 'Residente da área jurídica', 'residentes'),
('Residente Técnico', 'Residente da área técnica', 'residentes'),
('Público Externo', 'Usuário externo à instituição', 'externos'),
('Consultor', 'Consultor externo', 'externos'),
('Prestador de Serviço', 'Prestador de serviços', 'terceirizados'),
('Bolsista', 'Bolsista da instituição', 'bolsistas'),
('Voluntário', 'Voluntário', 'voluntarios'),
('Pesquisador', 'Pesquisador', 'pesquisadores'),
('Docente', 'Professor/Docente', 'docentes')
ON CONFLICT (name) DO NOTHING;

-- Inserir segmentos padrão
INSERT INTO course_segments (name, description) VALUES
('Capacitação', 'Cursos de capacitação e treinamento'),
('Pós-graduação', 'Cursos de pós-graduação'),
('Extensão', 'Cursos de extensão'),
('Atualização', 'Cursos de atualização profissional'),
('Especialização', 'Cursos de especialização')
ON CONFLICT (name) DO NOTHING;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_user_positions_category ON user_positions(category);
CREATE INDEX IF NOT EXISTS idx_profiles_position_id ON profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_courses_segment_id ON courses(segment_id);
CREATE INDEX IF NOT EXISTS idx_institutional_evaluations_course_id ON institutional_evaluations(course_id);
CREATE INDEX IF NOT EXISTS idx_institutional_evaluations_evaluation_type ON institutional_evaluations(evaluation_type);
CREATE INDEX IF NOT EXISTS idx_moodle_academic_works_course_id ON moodle_academic_works(course_id);
CREATE INDEX IF NOT EXISTS idx_moodle_certificates_course_id ON moodle_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_executed_at ON report_executions(executed_at);

-- Comentários nas tabelas
COMMENT ON TABLE user_positions IS 'Tabela para armazenar os diferentes tipos de cargos/posições dos usuários';
COMMENT ON TABLE course_segments IS 'Tabela para categorizar cursos por segmento (capacitação, pós-graduação, etc.)';
COMMENT ON TABLE institutional_evaluations IS 'Tabela para armazenar avaliações de alunos, professores e instituição';
COMMENT ON TABLE moodle_academic_works IS 'Tabela para sincronizar trabalhos acadêmicos do Moodle';
COMMENT ON TABLE moodle_certificates IS 'Tabela para sincronizar certificados do Moodle';
COMMENT ON TABLE custom_reports IS 'Tabela para armazenar configurações de relatórios personalizados';
COMMENT ON TABLE report_executions IS 'Tabela para histórico de execução de relatórios';