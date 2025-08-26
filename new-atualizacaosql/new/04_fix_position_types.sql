-- Script para corrigir incompatibilidade de tipos na função get_enrollment_by_position
-- Data: 2024
-- Descrição: Resolve erro 42804 - incompatibilidade entre VARCHAR e TEXT

-- Primeiro, verificar se a função existe antes de tentar removê-la
DO $$
BEGIN
    -- Remove a função existente se ela existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_enrollment_by_position') THEN
        DROP FUNCTION IF EXISTS get_enrollment_by_position(DATE, DATE, UUID, VARCHAR);
        RAISE NOTICE 'Função get_enrollment_by_position removida com sucesso.';
    ELSE
        RAISE NOTICE 'Função get_enrollment_by_position não encontrada.';
    END IF;
END $$;

-- Recriar a função com conversão explícita de tipos
CREATE OR REPLACE FUNCTION get_enrollment_by_position(
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL,
    course_id_param UUID DEFAULT NULL,
    period_type VARCHAR DEFAULT 'monthly'
)
RETURNS TABLE (
    period_label TEXT,
    position_name TEXT,
    position_category TEXT,
    total_enrollments BIGINT,
    active_enrollments BIGINT,
    completed_enrollments BIGINT
) AS $$
BEGIN
    IF period_type = 'daily' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(e.enrolled_at::date, 'YYYY-MM-DD')::TEXT as period,
            COALESCE(up.name::TEXT, 'Não informado'::TEXT) as position_name,
            COALESCE(up.category::TEXT, 'outros'::TEXT) as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(e.enrolled_at::date, 'YYYY-MM-DD'), up.name, up.category
        ORDER BY period, position_name;
    ELSIF period_type = 'monthly' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('month', e.enrolled_at), 'YYYY-MM')::TEXT as period,
            COALESCE(up.name::TEXT, 'Não informado'::TEXT) as position_name,
            COALESCE(up.category::TEXT, 'outros'::TEXT) as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('month', e.enrolled_at), 'YYYY-MM'), up.name, up.category
        ORDER BY period, position_name;
    ELSE -- annual
        RETURN QUERY
        SELECT 
            TO_CHAR(date_trunc('year', e.enrolled_at), 'YYYY')::TEXT as period,
            COALESCE(up.name::TEXT, 'Não informado'::TEXT) as position_name,
            COALESCE(up.category::TEXT, 'outros'::TEXT) as position_category,
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
            COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completed_enrollments
        FROM enrollments e
        LEFT JOIN profiles p ON e.user_id = p.id
        LEFT JOIN user_positions up ON p.position_id = up.id
        WHERE 
            (start_date_param IS NULL OR e.enrolled_at::date >= start_date_param)
            AND (end_date_param IS NULL OR e.enrolled_at::date <= end_date_param)
            AND (course_id_param IS NULL OR e.course_id = course_id_param)
        GROUP BY TO_CHAR(date_trunc('year', e.enrolled_at), 'YYYY'), up.name, up.category
        ORDER BY period, position_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário para a função
COMMENT ON FUNCTION get_enrollment_by_position(DATE, DATE, UUID, VARCHAR) IS 
'Retorna relatório de matrículas agrupadas por cargo/posição do usuário com conversão explícita de tipos';

-- Verificar se a função foi criada corretamente
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_enrollment_by_position'
ORDER BY proname;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Script executado com sucesso! Função get_enrollment_by_position corrigida para compatibilidade de tipos.';
END $$;