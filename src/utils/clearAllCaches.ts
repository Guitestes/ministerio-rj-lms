/**
 * Script para limpar completamente o cache e reiniciar o ambiente de desenvolvimento
 */

import { clearAuthCacheManually } from '@/integrations/supabase/client';

// Função para limpar todo o cache do localStorage e sessionStorage
const clearAllCaches = () => {
  try {
    // Limpar localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
      console.log('✅ localStorage limpo');
    }
    
    // Limpar sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
      console.log('✅ sessionStorage limpo');
    }
    
    // Limpar cache de autenticação específico
    clearAuthCacheManually();
    
    // Limpar cache de erros
    // @ts-ignore - função adicionada
    if (typeof clearErrorCache === 'function') {
      // @ts-ignore
      clearErrorCache();
    }
    
    console.log('✅ Todos os caches limpos com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar caches:', error);
    return false;
  }
};

// Função para reiniciar o ambiente
const restartEnvironment = () => {
  try {
    console.log('🔄 Reiniciando ambiente de desenvolvimento...');
    
    // Limpar caches
    clearAllCaches();
    
    // Recarregar a página
    if (typeof window !== 'undefined') {
      console.log('🔁 Recarregando página...');
      window.location.reload();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao reiniciar ambiente:', error);
    return false;
  }
};

// Exportar funções
export { clearAllCaches, restartEnvironment };

// Se executado diretamente
if (typeof window === 'undefined') {
  console.log('Para usar no navegador, cole as seguintes funções no console:');
  console.log('1. clearAllCaches() - Limpa todos os caches');
  console.log('2. restartEnvironment() - Reinicia o ambiente completo');
}