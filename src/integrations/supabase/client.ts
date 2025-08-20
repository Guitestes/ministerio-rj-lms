import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// As chaves e a URL do Supabase são fornecidas como variáveis de ambiente no ambiente de produção.
// Para desenvolvimento local, você pode usar um arquivo .env.local.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para garantir que as variáveis de ambiente foram carregadas
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
}

/**
 * Cliente Supabase
 *
 * Este é o cliente principal para interagir com o Supabase.
 * Ele é configurado para usar o fluxo de autenticação PKCE e persistir a sessão,
 * o que é a prática recomendada para aplicações web.
 *
 * O wrapper de fetch personalizado foi removido para simplificar e evitar problemas
 * de cache e tratamento de erros complexos que podem mascarar problemas reais do backend.
 * A biblioteca `@supabase/supabase-js` já possui um tratamento de erros robusto.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'lms-auth-token-v3', // Chave de armazenamento atualizada para evitar conflitos
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/**
 * Limpa o cache de autenticação do Supabase no localStorage.
 * Útil para forçar um novo login em caso de problemas de sessão.
 */
export const clearAuthCacheManually = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Remove chaves relacionadas ao Supabase e ao LMS
      if (key && (key.startsWith('sb-') || key.startsWith('lms-auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Cache de autenticação do Supabase limpo do localStorage.');
  } catch (e) {
    console.error('Erro ao limpar o cache de autenticação:', e);
  }
};

/**
 * Limpa o cache de erros que pode estar bloqueando requisições
 * conforme documentado em CORREÇÃO_MATRÍCULA.md
 */
export const clearErrorCache = () => {
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
    // @ts-ignore - variável global que pode existir em runtime
    if (typeof errorPaths !== 'undefined' && (errorPaths instanceof Map || errorPaths instanceof Set)) {
      // @ts-ignore
      errorPaths.clear();
    }
    
    console.log('Cache de erros limpo');
  } catch (e) {
    console.error('Erro ao limpar cache de erros:', e);
  }
};