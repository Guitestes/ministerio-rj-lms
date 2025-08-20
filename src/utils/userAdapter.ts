
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';
import { roleService, UserRole } from '@/services/roleService';

/**
 * Adapta um usuário do Supabase para o formato interno da aplicação
 * Prioriza app_metadata sobre user_metadata para maior segurança
 */
export const adaptSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  
  // Priorizar app_metadata (mais seguro) sobre user_metadata
  // app_metadata é controlado pelo servidor e não pode ser modificado pelo cliente
  const role = (supabaseUser.app_metadata?.role || 
                supabaseUser.user_metadata?.role || 
                'student') as UserRole;
  
  const email = supabaseUser.email || '';
  
  // Usar o serviço de papéis para determinar o papel correto baseado no email
  const correctRole = email ? roleService.getDefaultRole(email) : role;
  
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || 
          supabaseUser.app_metadata?.name || 
          email.split('@')[0] || 
          'Usuário',
    email,
    role: correctRole,
    avatar: supabaseUser.user_metadata?.avatar || 
            supabaseUser.app_metadata?.avatar || 
            undefined,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
  };
};

/**
 * Verifica se os metadados do usuário estão consistentes
 */
export const validateUserMetadata = (supabaseUser: SupabaseUser): boolean => {
  const userRole = supabaseUser.user_metadata?.role;
  const appRole = supabaseUser.app_metadata?.role;
  
  // Se ambos existem, devem ser iguais
  if (userRole && appRole) {
    return userRole === appRole;
  }
  
  // Se apenas um existe, está ok
  return true;
};

/**
 * Extrai informações de papel de forma segura
 */
export const extractUserRole = (supabaseUser: SupabaseUser): UserRole => {
  // Sempre priorizar app_metadata por segurança
  return (supabaseUser.app_metadata?.role || 
          supabaseUser.user_metadata?.role || 
          'student') as UserRole;
};
