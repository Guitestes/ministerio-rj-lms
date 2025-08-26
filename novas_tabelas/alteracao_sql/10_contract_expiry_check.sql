CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
    expiring_contract RECORD;
BEGIN
    FOR expiring_contract IN
        SELECT id, title, end_date, provider_id
        FROM public.contracts
        WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND status = 'active'
    LOOP
        FOR admin_user_id IN
            SELECT id FROM public.profiles WHERE role = 'admin'
        LOOP
            INSERT INTO public.notifications (user_id, message, type, link)
            VALUES (
                admin_user_id,
                'O contrato "' || expiring_contract.title || '" com o prestador ' || (SELECT name FROM public.service_providers WHERE id = expiring_contract.provider_id) || ' está próximo do vencimento em ' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '.',
                'contract_expiry',
                '/admin/service-providers'
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
