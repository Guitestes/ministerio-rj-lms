import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ynbbpcurdsbijxaazive.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmJwY3VyZHNiaWp4YWF6aXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTE3OTgsImV4cCI6MjA3MDA2Nzc5OH0.O0KwEkMGYazHnDVvakP9dzU6HZX0hRJPyATTV9aVqz8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunction() {
  console.log('=== Verificando função get_dropout_students ===\n');
  
  try {
    // Teste 1: Verificar qual função existe no banco
    console.log('1. Verificando assinatura da função no banco...');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, specific_name, routine_definition')
      .eq('routine_name', 'get_dropout_students')
      .eq('routine_schema', 'public');
    
    if (funcError) {
      console.log('❌ Erro ao consultar funções:', funcError);
    } else {
      console.log('📋 Funções encontradas:', functions?.length || 0);
      if (functions && functions.length > 0) {
        functions.forEach((func, index) => {
          console.log(`   ${index + 1}. ${func.specific_name}`);
        });
      }
    }
    
    // Teste 2: Chamar função com parâmetros da aplicação
    console.log('\n2. Testando função com parâmetros da aplicação...');
    const { data: data2, error: error2 } = await supabase.rpc('get_dropout_students', {
      class_id_param: null,
      course_id_param: null,
      segment_param: null,
      min_frequency: 75.0
    });
    
    if (error2) {
      console.log('❌ Erro ao chamar função com parâmetros da aplicação:', error2);
    } else {
      console.log('✅ Função executada com sucesso (parâmetros da aplicação)');
      console.log('📊 Registros retornados:', data2?.length || 0);
    }
    
    // Teste 3: Chamar função com parâmetros do script 10
    console.log('\n3. Testando função com parâmetros do script 10...');
    const { data: data3, error: error3 } = await supabase.rpc('get_dropout_students', {
      start_date_param: null,
      end_date_param: null
    });
    
    if (error3) {
      console.log('❌ Erro ao chamar função com parâmetros do script 10:', error3);
    } else {
      console.log('✅ Função executada com sucesso (parâmetros do script 10)');
      console.log('📊 Registros retornados:', data3?.length || 0);
    }
    
    // Teste 4: Requisição POST direta com parâmetros da aplicação
    console.log('\n4. Testando requisição POST direta (parâmetros da aplicação)...');
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_dropout_students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        class_id_param: null,
        course_id_param: null,
        segment_param: null,
        min_frequency: 75.0
      })
    });
    
    console.log('📡 Status da requisição:', response.status);
    
    if (response.ok) {
      const data4 = await response.json();
      console.log('✅ Requisição POST executada com sucesso');
      console.log('📊 Registros retornados:', data4?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na requisição POST:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

checkFunction();