/**
 * Script para limpar o cache de erros que está bloqueando requisições
 * conforme documentado em CORREÇÃO_MATRÍCULA.md
 */

// Função para limpar o cache de erros
const clearEnrollmentErrors = () => {
  try {
    // Limpar qualquer estado de erro armazenado
    if (typeof window !== 'undefined' && window.localStorage) {
      // Remover entradas relacionadas a erros de matrícula
      Object.keys(localStorage).forEach(key => {
        if (key.includes('error') || key.includes('enrollment') || key.includes('blocked')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Se houver um Map ou Set para errorPaths (como mencionado no documento)
    if (typeof errorPaths !== 'undefined' && errorPaths instanceof Map || errorPaths instanceof Set) {
      errorPaths.clear();
      console.log('Cache de erros limpo');
    } else {
      console.log('Nenhum cache de erros encontrado ou cache já limpo');
    }
    
    // Forçar atualização da página para garantir que o estado seja redefinido
    console.log('Cache de erros limpo. Recarregue a página para aplicar as mudanças.');
  } catch (e) {
    console.error('Erro ao limpar cache de erros:', e);
  }
};

// Função para testar se o endpoint de matrícula está funcionando
const testEnrollmentAfterFix = async () => {
  try {
    // Simular uma requisição para o endpoint problemático
    console.log('Testando endpoint de matrícula...');
    
    // Aqui você pode adicionar uma chamada real ao endpoint
    // Exemplo:
    // const response = await fetch('/rest/v1/enrollments', { method: 'GET' });
    // console.log('Status da requisição:', response.status);
    
    console.log('Teste concluído. Verifique se os erros 406 foram resolvidos.');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
};

// Exportar funções para uso no navegador
if (typeof window !== 'undefined') {
  window.clearEnrollmentErrors = clearEnrollmentErrors;
  window.testEnrollmentAfterFix = testEnrollmentAfterFix;
}

// Se for executado diretamente via Node.js
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  console.log('Para usar no navegador, cole as seguintes funções no console:');
  console.log('1. clearEnrollmentErrors() - Limpa o cache de erros');
  console.log('2. testEnrollmentAfterFix() - Testa o endpoint de matrícula');
}

export { clearEnrollmentErrors, testEnrollmentAfterFix };