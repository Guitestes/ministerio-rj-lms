-- Verificar se as tabelas de marketing já existem
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('marketing_campaigns', 'leads', 'email_templates', 'email_lists')
ORDER BY table_name, ordinal_position;

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('marketing_campaigns', 'leads', 'email_templates', 'email_lists');