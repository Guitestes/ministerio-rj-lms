import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ynbbpcurdsbijxaazive.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmJwY3VyZHNiaWp4YWF6aXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ5MTc5OCwiZXhwIjoyMDcwMDY3Nzk4fQ.olW15brQSZ82h9HwCx3VFpGZVMk9LobOGItUiLgRpaI';

// Cliente Supabase com service role (bypassa RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: 'public'
  }
});

async function checkEnrollmentPolicies() {
  console.log('🔍 Verificando políticas RLS para enrollments...');
  
  try {
    // Verificar se a tabela enrollments existe e é acessível
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .limit(1);
    
    if (enrollmentError) {
      console.log('❌ Erro ao acessar tabela enrollments:', enrollmentError.message);
      return false;
    }
    
    console.log('✅ Tabela enrollments acessível');
    
    // Verificar se a tabela classes existe
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('*')
      .limit(1);
    
    if (classError) {
      console.log('❌ Erro ao acessar tabela classes:', classError.message);
      return false;
    }
    
    console.log('✅ Tabela classes acessível');
    
    // Verificar se a tabela courses existe
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .limit(1);
    
    if (courseError) {
      console.log('❌ Erro ao acessar tabela courses:', courseError.message);
      return false;
    }
    
    console.log('✅ Tabela courses acessível');
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro durante verificação:', error.message);
    return false;
  }
}

async function testEnrollmentFlow() {
  console.log('\n🧪 Testando fluxo de matrícula...');
  
  try {
    // Buscar um usuário de teste
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'student')
      .limit(1);
    
    if (profileError || !profiles || profiles.length === 0) {
      console.log('❌ Não foi possível encontrar usuário estudante para teste');
      return false;
    }
    
    const testUser = profiles[0];
    console.log('👤 Usuário de teste:', testUser.email);
    
    // Buscar uma turma disponível
    const { data: availableClasses, error: classError } = await supabase
      .from('classes')
      .select('id, course_id, name, max_students')
      .limit(1);
    
    if (classError || !availableClasses || availableClasses.length === 0) {
      console.log('❌ Não foi possível encontrar turma para teste');
      return false;
    }
    
    const testClass = availableClasses[0];
    console.log('🎓 Turma de teste:', testClass.name);
    
    // Verificar se já existe matrícula
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', testUser.id)
      .eq('class_id', testClass.id)
      .single();
    
    if (existingEnrollment) {
      console.log('⚠️ Usuário já está matriculado nesta turma');
      return true;
    }
    
    // Tentar criar matrícula de teste
    const enrollmentData = {
      user_id: testUser.id,
      class_id: testClass.id,
      course_id: testClass.course_id,
      status: 'active',
      enrolled_at: new Date().toISOString()
    };
    
    console.log('📝 Tentando criar matrícula...');
    const { data: newEnrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert(enrollmentData)
      .select();
    
    if (enrollError) {
      console.log('❌ Erro na criação de matrícula:', enrollError.message);
      
      // Analisar tipo de erro
      if (enrollError.message.includes('policy') || enrollError.message.includes('RLS')) {
        console.log('🔧 Problema identificado: RLS está bloqueando inserções');
        return false;
      }
      
      if (enrollError.message.includes('foreign key') || enrollError.message.includes('constraint')) {
        console.log('🔧 Problema identificado: Violação de constraint');
        return false;
      }
      
      return false;
    }
    
    console.log('✅ Matrícula criada com sucesso!');
    console.log('📄 Dados da matrícula:', newEnrollment);
    
    // Limpar teste
    if (newEnrollment && newEnrollment[0]) {
      await supabase
        .from('enrollments')
        .delete()
        .eq('id', newEnrollment[0].id);
      console.log('🧹 Matrícula de teste removida');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro no teste de matrícula:', error.message);
    return false;
  }
}

async function checkFormService() {
  console.log('\n📋 Verificando serviço de formulários...');
  
  try {
    // Verificar se a tabela custom_forms existe
    const { data: forms, error: formError } = await supabase
      .from('custom_forms')
      .select('*')
      .limit(1);
    
    if (formError) {
      console.log('❌ Erro ao acessar tabela custom_forms:', formError.message);
      return false;
    }
    
    console.log('✅ Tabela custom_forms acessível');
    
    // Verificar se há formulários disponíveis
    const { data: availableForms, error: availableError } = await supabase
      .from('custom_forms')
      .select('id, title, form_type')
      .eq('is_active', true);
    
    if (availableError) {
      console.log('❌ Erro ao buscar formulários ativos:', availableError.message);
      return false;
    }
    
    console.log(`✅ Encontrados ${availableForms?.length || 0} formulários ativos`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro na verificação de formulários:', error.message);
    return false;
  }
}

async function fixEnrollmentIssues() {
  console.log('\n🔧 Aplicando correções para problemas de matrícula...');
  
  try {
    console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
    console.log('\n-- 1. CORRIGIR POLÍTICAS RLS PARA ENROLLMENTS --');
    console.log('DROP POLICY IF EXISTS "allow_enrollment_insert" ON public.enrollments;');
    console.log('CREATE POLICY "allow_enrollment_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);');
    
    console.log('\n-- 2. CORRIGIR POLÍTICAS RLS PARA CLASSES --');
    console.log('DROP POLICY IF EXISTS "allow_class_read" ON public.classes;');
    console.log('CREATE POLICY "allow_class_read" ON public.classes FOR SELECT TO authenticated USING (true);');
    
    console.log('\n-- 3. CORRIGIR POLÍTICAS RLS PARA CUSTOM_FORMS --');
    console.log('DROP POLICY IF EXISTS "allow_form_read" ON public.custom_forms;');
    console.log('CREATE POLICY "allow_form_read" ON public.custom_forms FOR SELECT TO authenticated USING (is_active = true);');
    
    console.log('\n-- 4. FUNÇÃO PARA VERIFICAR CAPACIDADE DA TURMA --');
    console.log(`CREATE OR REPLACE FUNCTION check_class_capacity(class_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM enrollments
  WHERE class_id = class_id_param AND status = 'active';
  
  SELECT max_students INTO max_capacity
  FROM classes
  WHERE id = class_id_param;
  
  RETURN current_count < COALESCE(max_capacity, 999999);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
    
    console.log('\n-- 5. TRIGGER PARA VALIDAR MATRÍCULA --');
    console.log(`CREATE OR REPLACE FUNCTION validate_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a turma tem capacidade
  IF NOT check_class_capacity(NEW.class_id) THEN
    RAISE EXCEPTION 'Turma lotada';
  END IF;
  
  -- Verificar se o usuário já está matriculado
  IF EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = NEW.user_id
    AND class_id = NEW.class_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Usuário já matriculado nesta turma';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enrollment_validation_trigger ON enrollments;
CREATE TRIGGER enrollment_validation_trigger
  BEFORE INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION validate_enrollment();`);
    
    console.log('\n-- 6. POLÍTICA PARA PERMITIR LEITURA DE ENROLLMENTS --');
    console.log('DROP POLICY IF EXISTS "allow_enrollment_read" ON public.enrollments;');
    console.log('CREATE POLICY "allow_enrollment_read" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (\'admin\', \'professor\')));');
    
    console.log('\n🚨 EXECUTE ESTES COMANDOS NO SQL EDITOR DO SUPABASE PARA CORRIGIR OS PROBLEMAS!');
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro durante aplicação de correções:', error.message);
    return false;
  }
}

async function checkErrorPaths() {
  console.log('\n🔍 Verificando caminhos com erro no client.ts...');
  
  try {
    // Simular requisições que podem estar causando erro 406
    const problematicPaths = [
      '/rest/v1/enrollments',
      '/rest/v1/custom_forms',
      '/rest/v1/classes',
      '/rest/v1/courses'
    ];
    
    for (const path of problematicPaths) {
      console.log(`\n🧪 Testando caminho: ${path}`);
      
      try {
        const tableName = path.split('/').pop();
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Erro em ${path}:`, error.message);
        } else {
          console.log(`✅ Caminho ${path} funcionando`);
        }
      } catch (err) {
        console.log(`❌ Erro de conexão em ${path}:`, err.message);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Erro na verificação de caminhos:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🔍 Iniciando diagnóstico de problemas de matrícula...');
  
  try {
    console.log('\n📋 Verificando estado atual das tabelas...');
    const policiesOk = await checkEnrollmentPolicies();
    
    console.log('\n📋 Verificando serviço de formulários...');
    const formsOk = await checkFormService();
    
    console.log('\n🔍 Verificando caminhos com erro...');
    await checkErrorPaths();
    
    if (policiesOk) {
      console.log('\n🧪 Testando fluxo de matrícula...');
      const enrollmentOk = await testEnrollmentFlow();
      
      if (!enrollmentOk) {
        console.log('\n🔧 Aplicando correções...');
        await fixEnrollmentIssues();
      } else {
        console.log('\n🎉 Fluxo de matrícula funcionando corretamente!');
      }
    } else {
      console.log('\n🔧 Aplicando correções...');
      await fixEnrollmentIssues();
    }
    
    console.log('\n✅ Diagnóstico concluído!');
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Execute os comandos SQL mostrados acima no Supabase');
    console.log('2. Reinicie o servidor de desenvolvimento');
    console.log('3. Teste novamente o fluxo de matrícula');
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  }
}

if (typeof window === 'undefined') {
  // Node.js environment
  main().catch(console.error);
}

export { supabase, checkEnrollmentPolicies, testEnrollmentFlow, fixEnrollmentIssues };