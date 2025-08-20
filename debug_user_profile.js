// Script para debugar o problema de chave estrangeira
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ynbbpcurdsbijxaazive.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmJwY3VyZHNiaWp4YWF6aXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTE3OTgsImV4cCI6MjA3MDA2Nzc5OH0.O0KwEkMGYazHnDVvakP9dzU6HZX0hRJPyATTV9aVqz8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserProfile() {
  try {
    console.log('=== DEBUG: Verificando usuário atual e perfil ===');
    
    // 1. Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ Erro ao obter usuário ou usuário não autenticado:', userError?.message);
      return;
    }
    
    console.log('✅ Usuário autenticado:');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Metadata:', user.user_metadata);
    
    // 2. Verificar se existe perfil na tabela profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Erro ao buscar perfil:', profileError.message);
      console.log('❌ Código do erro:', profileError.code);
      
      if (profileError.code === 'PGRST116') {
        console.log('⚠️ Perfil não encontrado na tabela profiles!');
        console.log('🔧 Tentando criar perfil...');
        
        // Tentar criar o perfil manualmente
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email,
            role: user.user_metadata?.role || 'student'
          })
          .select()
          .single();
        
        if (createError) {
          console.log('❌ Erro ao criar perfil:', createError.message);
        } else {
          console.log('✅ Perfil criado com sucesso:', newProfile);
        }
      }
    } else {
      console.log('✅ Perfil encontrado:');
      console.log('  - ID:', profile.id);
      console.log('  - Nome:', profile.name);
      console.log('  - Email:', profile.email);
      console.log('  - Role:', profile.role);
      console.log('  - Created at:', profile.created_at);
    }
    
    // 3. Testar criação de solicitação
    console.log('\n=== TESTE: Criando solicitação ===');
    
    const testRequest = {
      user_id: user.id,
      request_type: 'academic',
      subject: 'Teste de solicitação',
      description: 'Esta é uma solicitação de teste para verificar o funcionamento do sistema.',
      status: 'open'
    };
    
    const { data: request, error: requestError } = await supabase
      .from('administrative_requests')
      .insert([testRequest])
      .select()
      .single();
    
    if (requestError) {
      console.log('❌ Erro ao criar solicitação:', requestError.message);
      console.log('❌ Código do erro:', requestError.code);
      console.log('❌ Detalhes:', requestError.details);
    } else {
      console.log('✅ Solicitação criada com sucesso:', request);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o debug
debugUserProfile();