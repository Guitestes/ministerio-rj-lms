-- Função para executar ações automáticas baseadas no tipo de ticket.
CREATE OR REPLACE FUNCTION public.execute_request_action(p_request_id UUID)
RETURNS void AS $$
DECLARE
  v_request_type TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Obter os detalhes da solicitação
  SELECT request_type, user_id INTO v_request_type, v_user_id
  FROM public.administrative_requests
  WHERE id = p_request_id;

  -- 2. Executar a ação com base no tipo de solicitação
  IF v_request_type = 'Trancamento' THEN
    -- Atualiza todas as matrículas ativas do usuário para 'trancado'
    UPDATE public.enrollments
    SET status = 'locked'
    WHERE user_id = v_user_id AND status = 'active';

    -- Opcional: Adicionar um log ou notificação sobre a ação
    RAISE NOTICE 'Matrículas do usuário % foram trancadas devido à aprovação do ticket %', v_user_id, p_request_id;
  END IF;

  -- Outros tipos de ações automáticas podem ser adicionados aqui
  -- ELSIF v_request_type = 'Outro_Tipo' THEN
  --   -- Lógica para outro tipo de ação
  -- END IF;
END;
$$ LANGUAGE plpgsql;
