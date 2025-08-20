CREATE OR REPLACE FUNCTION public.get_provider_performance()
RETURNS TABLE (
    provider_id UUID,
    provider_name TEXT,
    average_score NUMERIC,
    total_contracts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.id AS provider_id,
        sp.name AS provider_name,
        AVG(c.evaluation_score) AS average_score,
        COUNT(c.id) AS total_contracts
    FROM
        public.service_providers sp
    LEFT JOIN
        public.contracts c ON sp.id = c.provider_id
    GROUP BY
        sp.id, sp.name
    ORDER BY
        average_score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
