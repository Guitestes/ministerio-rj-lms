-- Atualização da tabela profiles para incluir dados profissionais e acadêmicos de professores

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS academic_background text,
ADD COLUMN IF NOT EXISTS professional_experience text,
ADD COLUMN IF NOT EXISTS qualifications jsonb,
ADD COLUMN IF NOT EXISTS teaching_specialties text[];

COMMENT ON COLUMN profiles.academic_background IS 'Formação acadêmica do professor';
COMMENT ON COLUMN profiles.professional_experience IS 'Experiência profissional do professor';
COMMENT ON COLUMN profiles.qualifications IS 'Qualificações e certificações em formato JSON';
COMMENT ON COLUMN profiles.teaching_specialties IS 'Especialidades de ensino';