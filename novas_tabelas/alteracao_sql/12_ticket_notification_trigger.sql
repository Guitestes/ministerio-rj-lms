-- Cria a função que irá gerar a notificação
CREATE OR REPLACE FUNCTION public.create_ticket_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o status foi realmente alterado
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Insere uma notificação para o usuário que abriu o ticket
    INSERT INTO public.notifications (user_id, message, type, link)
    VALUES (
      NEW.user_id,
      'O status do seu ticket "' || NEW.subject || '" foi atualizado para: ' || NEW.status,
      'ticket_status_update',
      '/admin/requests?request_id=' || NEW.id -- O link pode apontar para a página de detalhes do ticket
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger que será acionado após a atualização na tabela administrative_requests
CREATE TRIGGER ticket_status_change_trigger
AFTER UPDATE ON public.administrative_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_ticket_status_change_notification();
