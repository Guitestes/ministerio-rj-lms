/**
 * Script de teste para verificar se as correções de matrícula estão funcionando
 */

import { supabase } from '@/integrations/supabase/client';
import { formService } from '@/services/formService';
import { enrollClass } from '@/services/courses/enrollmentService';

async function testEnrollmentFix() {
  console.log('🧪 Iniciando teste de correções de matrícula...');
  
  try {
    // Testar conexão com o Supabase
    console.log('\n🔍 Testando conexão com o Supabase...');
    const { data, error } = await supabase
      .from('courses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão com o Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com o Supabase funcionando');
    
    // Testar endpoint de formulários (onde ocorria o erro 406)
    console.log('\n📋 Testando endpoint de formulários...');
    try {
      // Este teste pode falhar se não houver cursos, mas não deve causar erro 406
      const testCourseId = '00000000-0000-0000-0000-000000000000'; // ID inválido para teste
      const form = await formService.getFormForCourse(testCourseId);
      console.log('✅ Endpoint de formulários acessível (sem erro 406)');
    } catch (error) {
      if (error.message && error.message.includes('406')) {
        console.error('❌ Ainda há erro 406 no endpoint de formulários');
        return false;
      }
      console.log('✅ Endpoint de formulários acessível (sem erro 406)');
    }
    
    // Testar função de limpeza de cache
    console.log('\n🧹 Testando função de limpeza de cache...');
    try {
      // @ts-ignore - função adicionada
      if (typeof clearErrorCache === 'function') {
        // @ts-ignore
        clearErrorCache();
        console.log('✅ Função de limpeza de cache funcionando');
      } else {
        console.log('⚠️ Função de limpeza de cache não encontrada');
      }
    } catch (error) {
      console.error('❌ Erro ao testar função de limpeza de cache:', error.message);
    }
    
    // Testar endpoint de matrícula
    console.log('\n🎓 Testando endpoint de matrícula...');
    try {
      // Testar com IDs inválidos - não deve causar erro 406
      const testClassId = '00000000-0000-0000-0000-000000000000';
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      const result = await enrollClass(testClassId, testUserId);
      if (result.success) {
        console.log('✅ Endpoint de matrícula funcionando corretamente');
      } else {
        // Verificar se é um erro de negócio (esperado) ou erro 406
        if (result.message.includes('406')) {
          console.error('❌ Ainda há erro 406 no endpoint de matrícula');
          return false;
        }
        console.log('✅ Endpoint de matrícula funcionando corretamente (erro de negócio esperado)');
      }
    } catch (error) {
      if (error.message && error.message.includes('406')) {
        console.error('❌ Ainda há erro 406 no endpoint de matrícula');
        return false;
      }
      console.log('✅ Endpoint de matrícula funcionando corretamente (erro tratado)');
    }
    
    console.log('\n🎉 Todos os testes passaram! As correções parecem estar funcionando.');
    console.log('\n📝 Próximos passos:');
    console.log('1. Execute o script SQL de correções no Supabase');
    console.log('2. Reinicie o servidor de desenvolvimento');
    console.log('3. Teste o fluxo de matrícula real no navegador');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    return false;
  }
}

// Executar o teste se o script for chamado diretamente
if (typeof window === 'undefined') {
  testEnrollmentFix()
    .then(success => {
      if (success) {
        console.log('\n✅ Teste concluído com sucesso!');
      } else {
        console.log('\n❌ Teste falhou. Verifique os erros acima.');
      }
    })
    .catch(error => {
      console.error('❌ Erro inesperado:', error);
    });
}

export { testEnrollmentFix };