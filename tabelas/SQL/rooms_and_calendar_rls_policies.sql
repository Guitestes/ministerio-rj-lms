-- =====================================================
-- POLÍTICAS RLS PARA SALAS E EVENTOS DE CALENDÁRIO
-- Este arquivo cria as políticas necessárias para permitir
-- acesso às tabelas rooms e calendar_events
-- =====================================================

-- POLÍTICAS PARA A TABELA ROOMS
-- =====================================================

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can manage all rooms" ON public.rooms;
DROP POLICY IF EXISTS "Professors can manage rooms" ON public.rooms;

-- Política para visualizar salas (todos podem ver)
CREATE POLICY "Anyone can view rooms"
  ON public.rooms
  FOR SELECT
  USING (true);

-- Política para administradores gerenciarem todas as salas
CREATE POLICY "Admins can manage all rooms"
  ON public.rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para professores criarem e gerenciarem salas
CREATE POLICY "Professors can manage rooms"
  ON public.rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('professor', 'admin')
    )
  );

-- POLÍTICAS PARA A TABELA CALENDAR_EVENTS
-- =====================================================

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Anyone can view calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Admins can manage all calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Professors can manage class events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view events of enrolled classes" ON public.calendar_events;

-- Política para visualizar eventos (todos podem ver)
CREATE POLICY "Anyone can view calendar events"
  ON public.calendar_events
  FOR SELECT
  USING (true);

-- Política para administradores gerenciarem todos os eventos
CREATE POLICY "Admins can manage all calendar events"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para professores gerenciarem eventos de suas turmas
CREATE POLICY "Professors can manage class events"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON c.instructor_id = p.id
      WHERE c.id = class_id AND p.id = auth.uid() AND p.role IN ('professor', 'admin')
    )
  );

-- Política para usuários visualizarem eventos de turmas em que estão matriculados
CREATE POLICY "Users can view events of enrolled classes"
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid() AND e.class_id = calendar_events.class_id
    )
  );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON POLICY "Anyone can view rooms" ON public.rooms IS 
'Permite que qualquer usuário visualize as salas disponíveis';

COMMENT ON POLICY "Admins can manage all rooms" ON public.rooms IS 
'Permite que administradores tenham acesso completo às salas';

COMMENT ON POLICY "Professors can manage rooms" ON public.rooms IS 
'Permite que professores e administradores criem e gerenciem salas';

COMMENT ON POLICY "Anyone can view calendar events" ON public.calendar_events IS 
'Permite que qualquer usuário visualize eventos do calendário';

COMMENT ON POLICY "Admins can manage all calendar events" ON public.calendar_events IS 
'Permite que administradores tenham acesso completo aos eventos';

COMMENT ON POLICY "Professors can manage class events" ON public.calendar_events IS 
'Permite que professores gerenciem eventos de suas próprias turmas';

COMMENT ON POLICY "Users can view events of enrolled classes" ON public.calendar_events IS 
'Permite que usuários vejam eventos de turmas em que estão matriculados';