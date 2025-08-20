import { emailService } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';

// Função para testar envio de email individual
export const testSingleEmail = async () => {
  try {
    console.log('🧪 Testando envio de email individual...');
    
    const testEmail = {
      to: [{ email: 'teste@exemplo.com', name: 'Usuário Teste' }],
      subject: 'Email de Teste - OneEduca',
      content: `
        <h2>Email de Teste</h2>
        <p>Este é um email de teste do sistema OneEduca.</p>
        <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Se você recebeu este email, o sistema está funcionando corretamente!</p>
      `,
      campaignId: 'test-campaign-001'
    };

    const logId = await emailService.sendEmail(testEmail);
    
    if (logId) {
      console.log('✅ Email enviado com sucesso! Log ID:', logId);
      
      // Simular algumas métricas de teste
      await simulateEmailMetrics(logId, testEmail.to[0].email);
      
      return { success: true, logId };
    } else {
      console.log('❌ Falha no envio do email');
      return { success: false, error: 'Falha no envio' };
    }
  } catch (error) {
    console.error('❌ Erro no teste de email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

// Função para testar envio de email em lote
export const testBulkEmail = async () => {
  try {
    console.log('🧪 Testando envio de email em lote...');
    
    const recipients = [
      { email: 'teste1@exemplo.com', name: 'Usuário Teste 1' },
      { email: 'teste2@exemplo.com', name: 'Usuário Teste 2' },
      { email: 'teste3@exemplo.com', name: 'Usuário Teste 3' },
    ];

    const subject = 'Email em Lote - OneEduca';
    const content = `
      <h2>Email em Lote de Teste</h2>
      <p>Este é um email de teste em lote do sistema OneEduca.</p>
      <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
      <p>Total de destinatários: ${recipients.length}</p>
    `;

    const logIds = await emailService.sendBulkEmail(
      recipients,
      subject,
      content,
      undefined,
      'bulk-test-campaign-001'
    );
    
    console.log('✅ Emails em lote enviados! Log IDs:', logIds);
    
    // Simular métricas para cada email
    for (let i = 0; i < logIds.length; i++) {
      if (logIds[i]) {
        await simulateEmailMetrics(logIds[i], recipients[i].email);
      }
    }
    
    return { success: true, logIds, totalSent: logIds.length };
  } catch (error) {
    console.error('❌ Erro no teste de email em lote:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

// Função para simular métricas de email (para demonstração)
const simulateEmailMetrics = async (logId: string, recipientEmail: string) => {
  try {
    // Simular entrega (sempre acontece)
    await emailService.logEmailMetric(logId, recipientEmail, 'delivered');
    console.log(`📧 Métrica 'delivered' registrada para ${recipientEmail}`);
    
    // Simular abertura (70% de chance)
    if (Math.random() > 0.3) {
      setTimeout(async () => {
        await emailService.logEmailMetric(logId, recipientEmail, 'opened', {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: new Date().toISOString()
        });
        console.log(`👁️ Métrica 'opened' registrada para ${recipientEmail}`);
      }, 1000);
    }
    
    // Simular clique (30% de chance)
    if (Math.random() > 0.7) {
      setTimeout(async () => {
        await emailService.logEmailMetric(logId, recipientEmail, 'clicked', {
          url: 'https://oneeduca.com/dashboard',
          timestamp: new Date().toISOString()
        });
        console.log(`🖱️ Métrica 'clicked' registrada para ${recipientEmail}`);
      }, 2000);
    }
  } catch (error) {
    console.error('Erro ao simular métricas:', error);
  }
};

// Função para testar gerenciamento de listas de email
export const testEmailListManagement = async () => {
  try {
    console.log('🧪 Testando gerenciamento de listas de email...');
    
    // Criar uma lista de teste
    const { data: emailList, error: listError } = await supabase
      .from('email_lists')
      .insert({
        name: 'Lista de Teste',
        description: 'Lista criada para testes do sistema',
        created_by: 'test-user-id'
      })
      .select()
      .single();
    
    if (listError) throw listError;
    
    console.log('📋 Lista de email criada:', emailList.id);
    
    // Adicionar assinantes à lista
    const testSubscribers = [
      { email: 'assinante1@exemplo.com', name: 'Assinante 1' },
      { email: 'assinante2@exemplo.com', name: 'Assinante 2' },
      { email: 'assinante3@exemplo.com', name: 'Assinante 3' },
    ];
    
    for (const subscriber of testSubscribers) {
      await emailService.addSubscriberToList(emailList.id, subscriber.email, subscriber.name);
      console.log(`👤 Assinante adicionado: ${subscriber.email}`);
    }
    
    // Buscar assinantes da lista
    const subscribers = await emailService.getListSubscribers(emailList.id);
    console.log('📊 Total de assinantes ativos:', subscribers.length);
    
    // Remover um assinante
    await emailService.removeSubscriberFromList(emailList.id, testSubscribers[0].email);
    console.log(`🚫 Assinante removido: ${testSubscribers[0].email}`);
    
    // Verificar assinantes ativos novamente
    const activeSubscribers = await emailService.getListSubscribers(emailList.id);
    console.log('📊 Total de assinantes ativos após remoção:', activeSubscribers.length);
    
    return {
      success: true,
      listId: emailList.id,
      totalSubscribers: activeSubscribers.length
    };
  } catch (error) {
    console.error('❌ Erro no teste de gerenciamento de listas:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
};

// Função para executar todos os testes
export const runAllEmailTests = async () => {
  console.log('🚀 Iniciando testes completos do sistema de email...');
  
  const results = {
    singleEmail: await testSingleEmail(),
    bulkEmail: await testBulkEmail(),
    listManagement: await testEmailListManagement()
  };
  
  console.log('📊 Resultados dos testes:', results);
  
  const allSuccessful = Object.values(results).every(result => result.success);
  
  if (allSuccessful) {
    console.log('✅ Todos os testes passaram com sucesso!');
  } else {
    console.log('❌ Alguns testes falharam. Verifique os logs acima.');
  }
  
  return results;
};

// Função para limpar dados de teste
export const cleanupTestData = async () => {
  try {
    console.log('🧹 Limpando dados de teste...');
    
    // Remover logs de email de teste
    await supabase
      .from('email_logs')
      .delete()
      .like('campaign_id', '%test%');
    
    // Remover listas de teste
    await supabase
      .from('email_lists')
      .delete()
      .eq('name', 'Lista de Teste');
    
    console.log('✅ Dados de teste removidos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
  }
};